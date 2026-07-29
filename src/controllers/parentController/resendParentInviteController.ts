import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import crypto from "crypto";

export const resendParentInviteController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const existingInvite = await prisma.inviteToken.findFirst({
      where: { id, schoolId: req.user.schoolId, role: "PARENT" },
    });

    if (!existingInvite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (existingInvite.usedAt) {
      return res.status(400).json({ error: "Invite has already been used" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.inviteToken.update({
      where: { id },
      data: { token, expiresAt, usedAt: null },
    });

    res.json({
      invite: {
        id: invite.id,
        invitedName: invite.invitedName,
        invitedEmail: invite.invitedEmail,
        role: "PARENT",
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Resend Parent Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
