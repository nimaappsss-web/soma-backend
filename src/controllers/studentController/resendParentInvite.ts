import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateSecureToken } from "../../utils/tokens";
import { trySendParentEmail } from "../../utils/email";
import { createErrorResponse } from "../../utils/errorHandler";

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

    if (!invite.invitedEmail) {
      return res.status(400).json({ error: "No email associated with this invite" });
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

    // Fire-and-forget
    trySendParentEmail(invite.invitedEmail, school.name, invite.invitedName || "Parent", "your child", newToken).then(
      (result) => {
        if (!result.ok) {
          prisma.inviteToken.update({
            where: { id: invite.id },
            data: { emailFailed: true, emailError: result.error },
          }).catch(() => {});
        }
      },
    );

    res.json({ message: "Parent invite resent", expiresAt });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Parent Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
