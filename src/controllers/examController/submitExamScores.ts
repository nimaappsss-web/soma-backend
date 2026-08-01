import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { canAccessExam } from "../../utils/examAccess";

export const submitExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { scores } = req.body;

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: "scores array is required" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (exam.status !== "DRAFT") {
      return res.status(400).json({ error: "Scores are locked once an exam is published" });
    }

    const hasAccess = await canAccessExam(req.user, exam);
    if (!hasAccess) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const studentIds = scores.map((s: { studentId: string }) => s.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: req.user.schoolId },
      select: { id: true, classId: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s.classId]));

    for (const s of scores as Array<{ studentId: string; score: number; remarks?: string }>) {
      if (!studentMap.has(s.studentId)) {
        return res.status(400).json({ error: `Student ${s.studentId} not found` });
      }
      if (exam.classId && studentMap.get(s.studentId) !== exam.classId) {
        return res.status(400).json({ error: `Student ${s.studentId} does not belong to this exam's class` });
      }
      const parsedScore = Number(s.score);
      if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > exam.maxScore) {
        return res.status(400).json({ error: `Score for ${s.studentId} must be between 0 and ${exam.maxScore}` });
      }
    }

    const results = await Promise.all(
      scores.map((s: { studentId: string; score: number; remarks?: string }) =>
        prisma.examScore.upsert({
          where: { examId_studentId: { examId: req.params.id, studentId: s.studentId } },
          update: { score: Number(s.score), remarks: s.remarks || null },
          create: { examId: req.params.id, studentId: s.studentId, score: Number(s.score), remarks: s.remarks || null },
        })
      )
    );

    res.json({ message: "Scores saved", count: results.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
