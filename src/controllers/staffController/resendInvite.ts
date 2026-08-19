import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { staffInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";

export const resendInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId: req.user.schoolId },
    });

    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const invite = await prisma.inviteToken.findFirst({
      where: {
        schoolId: req.user.schoolId,
        invitedEmail: staff.email ?? undefined,
        usedAt: null,
        role: staff.role,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) {
      return res.status(404).json({ error: "No active invite found for this staff member" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const newToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { token: newToken, expiresAt },
    });

    if (invite.invitedEmail) {
      try {
        await sendTeacherInviteEmail(invite.invitedEmail, school.name, newToken, invite.invitedEmail, staff.phone, getFrontendUrl(req));
      } catch (err: any) {
        console.error("Failed to resend invite email:", err?.message || err);
      }
    }

    if (staff.phone) {
      const delivery = await sendBrandedWhatsAppMessage(
        cleanPhoneNumber(staff.phone),
        staffInviteWhatsAppMessage(school.name, newToken, invite.invitedEmail, staff.phone, getFrontendUrl(req)),
        { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
      );
      if (!delivery.ok) {
        console.warn(`[resendInvite] WhatsApp delivery failed for ${staff.phone}: ${delivery.error}`);
      }
    }

    res.json({ message: "Invite resent successfully", expiresAt });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Staff Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};