import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { canAccessExam } from "../../utils/examAccess";

export const examDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        component: { select: { id: true, name: true, maxScore: true } },
        _count: { select: { scores: true } },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const hasAccess = await canAccessExam(req.user, exam);
    if (!hasAccess) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    res.json({
      exam: {
        ...exam,
        subjectName: exam.subject.name,
        className: exam.class?.name || null,
        componentName: exam.component?.name || null,
        scoreCount: exam._count.scores,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Exam Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
