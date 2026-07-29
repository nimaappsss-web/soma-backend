import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const generateInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { role } = req.body as { role?: string };

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

    const baseUrl = process.env.FRONTEND_URL || "https://app.nimaschool.com";
    const link = `${baseUrl}/register?token=${token}`;

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
