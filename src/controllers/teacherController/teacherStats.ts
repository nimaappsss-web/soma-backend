import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const teacherStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const [total, active, pendingInvites] = await Promise.all([
      prisma.user.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] } } }),
      prisma.user.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] }, active: true } }),
      prisma.inviteToken.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] }, usedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    res.json({
      total,
      active,
      pendingInvites,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Teacher Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
