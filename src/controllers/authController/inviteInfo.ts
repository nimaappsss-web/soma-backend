import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const inviteInfo = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token: token as string },
    });

    if (!inviteToken) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "This invite has already been used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invite link has expired" });
    }

    res.json({
      email: inviteToken.invitedEmail,
      role: inviteToken.role,
      schoolId: inviteToken.schoolId,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Info");
    res.status(errorResponse.status).json(errorResponse);
  }
};
