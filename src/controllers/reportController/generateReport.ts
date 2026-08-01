import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";

export const generateReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, type } = req.body;

    if (!classId || !term || !type) {
      return res.status(400).json({ error: "classId, term, and type are required" });
    }

    const resolvedSession = await resolveSession(req.user.schoolId, term, session);

    const report = await prisma.report.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        classId,
        term,
        session: resolvedSession,
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
