import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, maxScore, date, status } = req.body;

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const updated = await prisma.examSession.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(maxScore !== undefined ? { maxScore } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      include: { subject: { select: { id: true, name: true } } },
    });

    res.json({ exam: { ...updated, subjectName: updated.subject.name } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Exam");
    res.status(errorResponse.status).json(errorResponse);
  }
};
