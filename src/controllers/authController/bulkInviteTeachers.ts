import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { createErrorResponse } from "../../utils/errorHandler";

export const bulkInviteTeachers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role !== "PRINCIPAL") {
      return res
        .status(403)
        .json({ error: "Only principals can invite teachers" });
    }

    if (!req.user.schoolId) {
      return res.status(400).json({ error: "No school registered yet" });
    }

    const { teachers } = req.body;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ error: "Teachers array is required" });
    }

    if (teachers.length > 100) {
      return res.status(400).json({ error: "Maximum 100 teachers per batch" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const invites = [];
    const errors = [];

    for (const teacher of teachers) {
      try {
        if (!teacher.teacherEmail) {
          errors.push({ error: "Email is required" });
          continue;
        }

        if (!validateEmail(teacher.teacherEmail)) {
          errors.push({
            email: teacher.teacherEmail,
            error: "Invalid email format",
          });
          continue;
        }

        const existingUser = await prisma.user.findFirst({
          where: { email: teacher.teacherEmail },
        });

        if (existingUser) {
          errors.push({
            email: teacher.teacherEmail,
            error: "Email already registered",
          });
          continue;
        }

        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await prisma.inviteToken.create({
          data: {
            schoolId: req.user.schoolId,
            invitedBy: req.user.userId,
            token,
            invitedEmail: teacher.teacherEmail,
            invitedName: "Teacher",
            role: teacher.role || "TEACHER",
            expiresAt,
          },
        });

        const frontendUrl = process.env.FRONTEND_URL || "https://soma-frontend-zeta.vercel.app";
        const inviteLink = `${frontendUrl}/verify-teacher?token=${token}&schoolId=${school.id}`;

        try {
          await sendTeacherInviteEmail(teacher.teacherEmail, school.name, inviteLink);
        } catch (err: any) {
          console.error("Failed to send invite email:", err?.message || err);
        }

        invites.push({
          teacherEmail: teacher.teacherEmail,
          role: teacher.role || "TEACHER",
          expiresAt,
        });
      } catch (err) {
        errors.push({
          email: teacher.teacherEmail,
          error: "Failed to create invite",
        });
      }
    }

    res.status(201).json({
      message: `Created ${invites.length} invite(s)`,
      invites,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: teachers.length,
        successful: invites.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Invite Teachers");
    res.status(errorResponse.status).json(errorResponse);
  }
};
