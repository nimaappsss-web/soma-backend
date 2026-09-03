import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { createErrorResponse } from "../../utils/errorHandler";
import { validateEmail } from "../../utils/validation";

export const resendInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { inviteId } = req.params;
    const correctedEmail =
      typeof req.body?.email === "string" && req.body.email.trim()
        ? req.body.email.trim()
        : undefined;

    if (correctedEmail && !validateEmail(correctedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (correctedEmail) {
      // Email is globally unique across all users — an invite can't claim one
      // that already belongs to someone.
      const taken = await prisma.user.findFirst({
        where: { email: correctedEmail },
        select: { id: true },
      });
      if (taken) {
        return res.status(409).json({ error: "Email already in use by another user" });
      }
    }

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

    const nextEmail = correctedEmail ?? invite.invitedEmail;

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: {
        token: newToken,
        expiresAt,
        ...(correctedEmail ? { invitedEmail: correctedEmail } : {}),
      },
    });

    if (nextEmail) {
      try {
        await sendTeacherInviteEmail(nextEmail, school.name, newToken, nextEmail, invite.invitedPhone, getFrontendUrl(req));
        // Delivery succeeded — clear any previous failure flag.
        if (invite.emailFailed) {
          await prisma.inviteToken
            .update({ where: { id: invite.id }, data: { emailFailed: false, emailError: null } })
            .catch(() => {});
        }
      } catch (err: any) {
        const msg = err?.message || "Unknown email error";
        console.error("Failed to resend invite email:", msg);
        // Persist the delivery failure so the teacher list can surface it.
        await prisma.inviteToken
          .update({ where: { id: invite.id }, data: { emailFailed: true, emailError: msg } })
          .catch(() => {});
      }
    }

    res.json({
      message: correctedEmail
        ? `Invite resent to ${nextEmail}`
        : "Invite resent successfully",
      invitedEmail: nextEmail,
      expiresAt,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
