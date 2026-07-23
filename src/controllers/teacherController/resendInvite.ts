import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { createErrorResponse } from "../../utils/errorHandler";

export const resendInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { inviteId } = req.params;

    const invite = await prisma.inviteToken.findFirst({
      where: {
        id: inviteId,
        schoolId: req.user.schoolId,
        usedAt: null,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found or already used" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const newToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { token: newToken, expiresAt },
    });

    if (invite.invitedEmail) {
      try {
        await sendTeacherInviteEmail(invite.invitedEmail, school.name, newToken);
      } catch (err: any) {
        console.error("Failed to resend invite email:", err?.message || err);
      }
    }

    res.json({
      message: "Invite resent successfully",
      expiresAt,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
