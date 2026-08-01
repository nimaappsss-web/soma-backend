import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { canAccessExam } from "../../utils/examAccess";

export const submitStudentScore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id, studentId } = req.params;
    const { score, remarks } = req.body;

    const exam = await prisma.examSession.findFirst({
      where: { id, schoolId: req.user.schoolId },
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

    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > exam.maxScore) {
      return res.status(400).json({ error: `score must be between 0 and ${exam.maxScore}` });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.user.schoolId },
      select: { id: true, name: true, admissionNo: true, classId: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (exam.classId && student.classId !== exam.classId) {
      return res.status(400).json({ error: "Student does not belong to this exam's class" });
    }

    const saved = await prisma.examScore.upsert({
      where: { examId_studentId: { examId: id, studentId } },
      update: { score: parsedScore, remarks: remarks || null },
      create: { examId: id, studentId, score: parsedScore, remarks: remarks || null },
    });

    res.json({
      studentId,
      studentName: student.name,
      admissionNo: student.admissionNo,
      score: saved.score,
      remarks: saved.remarks,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Student Score");
    res.status(errorResponse.status).json(errorResponse);
  }
};
