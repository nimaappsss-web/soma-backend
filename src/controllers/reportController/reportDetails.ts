import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const reportDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const report = await prisma.report.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Report Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
