import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const getExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const scores = await prisma.examScore.findMany({
      where: { examId: req.params.id },
      include: { student: { select: { id: true, name: true, admissionNo: true } } },
      orderBy: { score: "desc" },
    });

    res.json({
      examId: req.params.id,
      scores: scores.map((s) => ({
        studentId: s.student.id,
        studentName: s.student.name,
        admissionNo: s.student.admissionNo,
        score: s.score,
        remarks: s.remarks,
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
