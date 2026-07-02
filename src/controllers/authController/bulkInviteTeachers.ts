import { Response } from "express";
import { AuthRequest, InviteTeacherDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePhoneNumber } from "../../utils/validation";
import { generateInviteToken } from "../../utils/tokens";
import {
  formatWhatsAppMessage,
  generateWhatsAppLink,
} from "../../utils/whatsapp";
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

    const { teachers }: { teachers: InviteTeacherDto[] } = req.body;

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
        if (!validatePhoneNumber(teacher.teacherPhone)) {
          errors.push({
            teacher: teacher.teacherName,
            error: "Invalid phone number",
          });
          continue;
        }

        const existingUser = await prisma.user.findFirst({
          where: { phone: teacher.teacherPhone },
        });

        if (existingUser) {
          errors.push({
            teacher: teacher.teacherName,
            error: "Phone already registered",
          });
          continue;
        }

        const inviteCode = generateInviteToken();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const inviteUrl = `${process.env.FRONTEND_URL || "https://app.nimaapp.com"}/join/${inviteCode}`;

        await prisma.inviteToken.create({
          data: {
            schoolId: req.user.schoolId,
            invitedBy: req.user.userId,
            token: inviteCode,
            invitedName: teacher.teacherName,
            invitedPhone: teacher.teacherPhone,
            role: teacher.role || "TEACHER",
            expiresAt,
          },
        });

        const whatsappMessage = formatWhatsAppMessage(
          teacher.teacherName,
          school.name,
          inviteCode,
          inviteUrl,
        );

        const whatsappLink = generateWhatsAppLink(
          teacher.teacherPhone,
          whatsappMessage,
        );

        invites.push({
          code: inviteCode,
          teacherName: teacher.teacherName,
          teacherPhone: teacher.teacherPhone,
          role: teacher.role || "TEACHER",
          expiresAt,
          inviteUrl,
          whatsappLink,
        });
      } catch (err) {
        errors.push({
          teacher: teacher.teacherName,
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
