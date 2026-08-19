import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { teacherInviteWhatsAppMessage, staffInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";
import { getFrontendUrl } from "../../utils/frontendUrl";

export const generateInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { role, phone } = req.body as { role?: string; phone?: string };

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: { id: true, name: true },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const inviteToken = await prisma.inviteToken.create({
      data: {
        schoolId: school.id,
        invitedBy: req.user.userId,
        token,
        role: (role || "TEACHER").toUpperCase(),
        invitedName: null,
        invitedEmail: null,
        expiresAt,
      },
    });

    const baseUrl = getFrontendUrl(req);
    const link = `${baseUrl}/register?token=${token}`;

    if (phone) {
      const normalizedRole = (role || "TEACHER").toUpperCase();
      const message = normalizedRole === "STAFF"
        ? staffInviteWhatsAppMessage(school.name, token, undefined, phone, baseUrl)
        : teacherInviteWhatsAppMessage(school.name, token, undefined, phone, baseUrl);
      const delivery = await sendBrandedWhatsAppMessage(
        cleanPhoneNumber(phone),
        message,
        { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
      );
      if (!delivery.ok) {
        console.warn(`[generateInviteLink] WhatsApp delivery failed for ${phone}: ${delivery.error}`);
      }
    }

    res.status(201).json({
      token,
      link,
      expiresAt: inviteToken.expiresAt,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Generate Invite Link");
    res.status(errorResponse.status).json(errorResponse);
  }
};
