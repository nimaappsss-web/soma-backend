import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const generateReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, type } = req.body;

    if (!classId || !term || !session || !type) {
      return res.status(400).json({ error: "classId, term, session, and type are required" });
    }

    const report = await prisma.report.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        classId,
        term,
        session,
        type,
        generatedBy: req.user.userId,
      },
    });

    res.status(201).json({ report });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Generate Report");
    res.status(errorResponse.status).json(errorResponse);
  }
};
