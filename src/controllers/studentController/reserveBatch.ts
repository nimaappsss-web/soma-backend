import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const reserveBatch = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const batchSize = Math.min(20, Math.max(1, parseInt(req.body.batchSize) || 20));

    const updated = await prisma.school.update({
      where: { id: req.user.schoolId },
      data: { admissionCounter: { increment: batchSize } },
      select: { admissionPattern: true, admissionCounter: true },
    });

    const start = updated.admissionCounter - batchSize;
    const end = updated.admissionCounter - 1;

    res.json({
      batch: { start, end, count: batchSize },
      admissionPattern: updated.admissionPattern,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Reserve Batch");
    res.status(errorResponse.status).json(errorResponse);
  }
};
