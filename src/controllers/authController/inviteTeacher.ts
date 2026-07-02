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

export const inviteTeacher = async (req: AuthRequest, res: Response) => {
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

    const { teacherName, teacherPhone, role }: InviteTeacherDto = req.body;

    if (!validatePhoneNumber(teacherPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        phone: teacherPhone,
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Teacher with this phone number already exists" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const inviteCode = generateInviteToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const inviteUrl = `${process.env.FRONTEND_URL || "https://app.nimaapp.com"}/join/${inviteCode}`;

    await prisma.inviteToken.create({
      data: {
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token: inviteCode,
        invitedName: teacherName,
        invitedPhone: teacherPhone,
        role: role || "TEACHER",
        expiresAt,
      },
    });

    const whatsappMessage = formatWhatsAppMessage(
      teacherName,
      school.name,
      inviteCode,
      inviteUrl,
    );

    const whatsappLink = generateWhatsAppLink(teacherPhone, whatsappMessage);

    res.status(201).json({
      message: "Invite created successfully",
      invite: {
        code: inviteCode,
        teacherName,
        teacherPhone,
        role: role || "TEACHER",
        expiresAt,
        inviteUrl,
        whatsappLink,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
