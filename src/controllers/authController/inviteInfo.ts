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
      include: { user: { include: { school: true } } },
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

    const schoolId = inviteToken.schoolId;

    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true, code: true },
    });

    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, level: true, arm: true },
    });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    res.json({
      email: inviteToken.invitedEmail,
      role: inviteToken.role,
      school: school || null,
      subjects,
      classes,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Info");
    res.status(errorResponse.status).json(errorResponse);
  }
};
