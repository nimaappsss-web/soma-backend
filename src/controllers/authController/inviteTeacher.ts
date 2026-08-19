import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { teacherInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";

export const inviteTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!["PRINCIPAL", "SCHOOL_ADMIN"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Only principals and school admins can invite teachers" });
    }

    if (!req.user.schoolId) {
      return res.status(400).json({ error: "No school registered yet" });
    }

    const { teacherEmail, role, teacherPhone } = req.body;

    if (!teacherEmail) {
      return res.status(400).json({ error: "Teacher email is required" });
    }

    if (!validateEmail(teacherEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: teacherEmail },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "A user with this email already exists in the system" });
    }

    const pending = await prisma.inviteToken.findFirst({
      where: {
        schoolId: req.user.schoolId,
        invitedEmail: teacherEmail,
        role: "TEACHER",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pending) {
      return res
        .status(400)
        .json({ error: "A pending invite already exists for this email" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: {
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token,
        invitedEmail: teacherEmail,
        invitedName: "Teacher",
        role: role || "TEACHER",
        expiresAt,
      },
    });

    const frontendUrl = getFrontendUrl(req);
    try {
      await sendTeacherInviteEmail(teacherEmail, school.name, token, teacherEmail, teacherPhone, frontendUrl);
    } catch (err: any) {
      console.error("Failed to send invite email:", err?.message || err);
    }

    if (teacherPhone) {
      const delivery = await sendBrandedWhatsAppMessage(
        cleanPhoneNumber(teacherPhone),
        teacherInviteWhatsAppMessage(school.name, token, teacherEmail, teacherPhone, frontendUrl),
        { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
      );
      if (!delivery.ok) {
        console.warn(`[inviteTeacher] WhatsApp delivery failed for ${teacherPhone}: ${delivery.error}`);
      }
    }

    res.status(201).json({
      message: "Invite sent successfully",
      invite: {
        teacherEmail,
        teacherPhone: teacherPhone || undefined,
        role: role || "TEACHER",
        expiresAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
