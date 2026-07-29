import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const getStudentExamScore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id, studentId } = req.params;

    const exam = await prisma.examSession.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: { subject: { select: { id: true, name: true } } },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.user.schoolId },
      select: { id: true, name: true, admissionNo: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const score = await prisma.examScore.findUnique({
      where: { examId_studentId: { examId: id, studentId } },
    });

    res.json({
      examId: id,
      examName: exam.name,
      subjectName: exam.subject.name,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
      },
      score: score ? { score: score.score, remarks: score.remarks } : null,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Student Exam Score");
    res.status(errorResponse.status).json(errorResponse);
  }
};
