import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const submitExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { scores } = req.body;

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({ error: "scores array is required" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const results = await Promise.all(
      scores.map((s: { studentId: string; score: number; remarks?: string }) =>
        prisma.examScore.upsert({
          where: { examId_studentId: { examId: req.params.id, studentId: s.studentId } },
          update: { score: s.score, remarks: s.remarks },
          create: { examId: req.params.id, studentId: s.studentId, score: s.score, remarks: s.remarks },
        })
      )
    );

    res.json({ message: "Scores saved", count: results.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
