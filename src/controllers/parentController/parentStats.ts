import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const parentStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const [total, active, pending] = await Promise.all([
      prisma.user.count({ where: { schoolId, role: "PARENT" } }),
      prisma.user.count({ where: { schoolId, role: "PARENT", emailVerified: true } }),
      prisma.inviteToken.count({ where: { schoolId, role: "PARENT", usedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    res.json({ total, active, pending });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Parent Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
