import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateSecureToken } from "../../utils/tokens";
import { trySendParentEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { parentInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";

export const resendParentInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { inviteId } = req.params;

    const invite = await prisma.inviteToken.findFirst({
      where: {
        id: inviteId,
        schoolId: req.user.schoolId,
        role: "PARENT",
        usedAt: null,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: "Parent invite not found or already used" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: { name: true, id: true },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const newToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { token: newToken, expiresAt, emailFailed: false, emailError: null },
    });

    if (!invite.invitedEmail && !invite.invitedPhone) {
      return res.status(400).json({ error: "No email or phone associated with this invite" });
    }

    // Email is the priority; WhatsApp is the fallback when no email exists
    if (invite.invitedEmail) {
      trySendParentEmail(invite.invitedEmail, school.name, invite.invitedName || "Parent", "your child", newToken, invite.invitedEmail, invite.invitedPhone, getFrontendUrl(req)).then(
        (result) => {
          if (!result.ok) {
            prisma.inviteToken.update({
              where: { id: invite.id },
              data: { emailFailed: true, emailError: result.error },
            }).catch(() => {});
          }
        },
      );

      return res.json({ message: "Parent invite resent via email", expiresAt });
    }

    const delivery = await sendBrandedWhatsAppMessage(
      cleanPhoneNumber(invite.invitedPhone!),
      parentInviteWhatsAppMessage(school.name, invite.invitedName || "Parent", "your child", newToken, undefined, invite.invitedPhone, getFrontendUrl(req)),
      { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
    );
    if (!delivery.ok) {
      console.warn(`[resendParentInvite] WhatsApp delivery failed for ${invite.invitedPhone}: ${delivery.error}`);
    }

    res.json({ message: "Parent invite resent via WhatsApp", expiresAt });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Parent Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
