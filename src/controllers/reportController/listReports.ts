import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reports = await prisma.report.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ reports });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Reports");
    res.status(errorResponse.status).json(errorResponse);
  }
};
