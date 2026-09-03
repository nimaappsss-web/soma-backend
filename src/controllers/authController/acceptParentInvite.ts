import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { hashPassword, validatePassword } from "../../utils/password";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { localPhoneNumber } from "../../utils/whatsapp";
import { notifyMany } from "../../utils/notifications";

export const acceptParentInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token, password, name } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
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

    if (inviteToken.role !== "PARENT") {
      return res.status(400).json({ error: "This endpoint is for parent invites only" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "This invite has already been used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invite link has expired" });
    }

    const email = inviteToken.invitedEmail;
    const phone = inviteToken.invitedPhone;
    if (!email && !phone) {
      return res.status(400).json({ error: "No email or phone associated with this invite" });
    }

    const normalizedPhone = phone ? localPhoneNumber(phone) : undefined;

    // Check if user already exists within this school (was created by an older
    // version or another flow). Scoped by schoolId so a parent with an account
    // at School A can still accept invites at School B.
    const existingUser = await prisma.user.findFirst({
      where: {
        schoolId: inviteToken.schoolId,
        ...(email && normalizedPhone
          ? { OR: [{ email }, { phone: normalizedPhone }] }
          : email
            ? { email }
            : { phone: normalizedPhone }),
      },
    });

    if (existingUser && existingUser.passwordHash) {
      return res.status(400).json({ error: "Account already set up" });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      let user = existingUser;

      if (!user) {
        user = await tx.user.create({
          data: {
            name: name || inviteToken.invitedName || "Parent",
            email: email || undefined,
            phone: normalizedPhone || undefined,
            role: "PARENT",
            schoolId: inviteToken.schoolId,
            passwordHash,
            emailVerified: true,
            active: true,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            emailVerified: true,
            ...(email ? { email } : {}),
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
            ...(name || inviteToken.invitedName ? { name: name || inviteToken.invitedName } : {}),
          },
        });
      }

      await tx.inviteToken.update({
        where: { id: inviteToken.id },
        data: { usedAt: new Date(), usedBy: user.id },
      });

      return user;
    });

    const tokenPayload = {
      userId: result.id,
      schoolId: result.schoolId || undefined,
      role: result.role,
      email: result.email || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    void notifyAdminsOfAcceptedParent(
      inviteToken.schoolId,
      result.name || inviteToken.invitedName || "Parent",
    );

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

    res.status(201).json({
      message: "Parent account set up successfully",
      accessToken,
      refreshToken,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        schoolId: result.schoolId,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Accept Parent Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};

const notifyAdminsOfAcceptedParent = async (
  schoolId: string,
  parentName: string,
) => {
  try {
    const admins = await prisma.user.findMany({
      where: { schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] }, active: true },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await notifyMany(schoolId, admins.map((a) => a.id), {
      title: "New parent",
      message: `${parentName} accepted their parent invite.`,
      type: "INVITE",
      route: "/admin/parents",
      data: { parentName },
    });
  } catch (error) {
    console.error("[acceptParentInvite] Notification fan-out failed:", error);
  }
};
