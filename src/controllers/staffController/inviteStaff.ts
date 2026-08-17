import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import crypto from "crypto";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { staffInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";

export const inviteStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, phone, role, department, designation } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, schoolId: req.user.schoolId },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const invitedRole = (role || "STAFF").toUpperCase();

    const staff = await prisma.staff.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        email,
        phone: phone || null,
        role: invitedRole,
        department: department || null,
        designation: designation || null,
        status: "INVITED",
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token,
        invitedName: name,
        invitedEmail: email,
        role: invitedRole,
        expiresAt,
      },
    });

    if (phone) {
      const school = await prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: { name: true },
      });
      const delivery = await sendBrandedWhatsAppMessage(
        cleanPhoneNumber(phone),
        staffInviteWhatsAppMessage(school?.name || "School", token, email, phone),
        { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
      );
      if (!delivery.ok) {
        console.warn(`[inviteStaff] WhatsApp delivery failed for ${phone}: ${delivery.error}`);
      }
    }

    res.status(201).json({ staff });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
