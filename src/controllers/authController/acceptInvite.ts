import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { generateAccessToken, generateRefreshToken, verifyRegistrationToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendEmailOtp } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { generateOTP } from "../../utils/tokens";
import { notifyMany } from "../../utils/notifications";

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token, name, phone, password, formClassId, assignments, registrationToken } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "This invite has already been used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invite link has expired" });
    }

    const email = inviteToken.invitedEmail || req.body.email;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(password);

    const invitedEmail = inviteToken.invitedEmail;
    let emailVerified = false;

    if (invitedEmail) {
      emailVerified = true;
    } else if (registrationToken) {
      try {
        const payload = verifyRegistrationToken(registrationToken);
        if (payload.email === email && payload.purpose === "registration") {
          emailVerified = true;
        }
      } catch {
        emailVerified = false;
      }
    }

    if (!emailVerified) {
      const verifiedOtp = await prisma.oTP.findFirst({
        where: {
          email,
          verified: true,
        },
        orderBy: { createdAt: "desc" },
      });
      if (verifiedOtp) emailVerified = true;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          role: inviteToken.role,
          schoolId: inviteToken.schoolId,
          passwordHash,
          emailVerified,
          active: true,
          approvalStatus: "PENDING",
          formClassId: formClassId || null,
        },
        include: {
          formClass: { select: { id: true, name: true } },
        },
      });

      if (invitedEmail) {
        await tx.inviteToken.update({
          where: { id: inviteToken.id },
          data: { usedAt: new Date(), usedBy: user.id },
        });
      }

      if (assignments && Array.isArray(assignments)) {
        for (const assignment of assignments) {
          const { subjectId, classIds } = assignment;

          if (!subjectId || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
            continue;
          }

          const teacherAssignment = await tx.teacherAssignment.create({
            data: {
              teacherId: user.id,
              schoolId: inviteToken.schoolId,
              type: "subject",
              subjectId,
            },
          });

          await tx.teacherAssignmentClass.createMany({
            data: classIds.map((classId: string) => ({
              assignmentId: teacherAssignment.id,
              classId,
            })),
          });
        }
      }

      return user;
    });

    if (!emailVerified) {
      try {
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await prisma.oTP.create({ data: { email, code, expiresAt } });
        await sendEmailOtp(email, name, code, getFrontendUrl(req));
      } catch (err: any) {
        console.error("Failed to send verification email:", err?.message || err);
      }
    }

    const tokenPayload = {
      userId: result.id,
      schoolId: result.schoolId || undefined,
      role: result.role,
      email: result.email || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.session.create({
      data: {
        userId: result.id,
        deviceId: req.body.deviceId || crypto.randomUUID(),
        deviceType: "web",
        deviceName: req.body.deviceName || "Web Browser",
        refreshToken,
        isPrimary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    notifyAdminsOfAcceptedInvite(result.schoolId, result.name, result.role);

    res.status(201).json({
      message: emailVerified ? "Account created successfully" : "Account created. Please verify your email.",
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        schoolId: result.schoolId,
        emailVerified,
        active: result.active,
        approvalStatus: "PENDING",
        formClassId: result.formClassId,
        formClass: result.formClass?.name || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Accept Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};

const notifyAdminsOfAcceptedInvite = async (
  schoolId: string | null | undefined,
  userName: string,
  role: string,
) => {
  try {
    if (!schoolId) return;

    const admins = await prisma.user.findMany({
      where: { schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] }, active: true },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await notifyMany(schoolId, admins.map((a) => a.id), {
      title: "New team member",
      message: `${userName} accepted their invite as ${role.toLowerCase()}.`,
      type: "INVITE",
      route: "/admin/teachers",
      data: { userName, role },
    });
  } catch (error) {
    console.error("[acceptInvite] Notification fan-out failed:", error);
  }
};
