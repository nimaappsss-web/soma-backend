import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const reportHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { schoolId: req.user.schoolId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where: { schoolId: req.user.schoolId } }),
    ]);

    res.json({
      data: reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Report History");
    res.status(errorResponse.status).json(errorResponse);
  }
};
