import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { canAccessExam } from "../../utils/examAccess";

export const getExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        component: { select: { id: true, name: true } },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const hasAccess = await canAccessExam(req.user, exam);
    if (!hasAccess) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const existingScores = await prisma.examScore.findMany({
      where: { examId: req.params.id },
      include: { student: { select: { id: true, name: true, admissionNo: true } } },
    });

    const scoresById = new Map(existingScores.map((s) => [s.student.id, s]));

    let roster: Array<{
      studentId: string;
      studentName: string;
      admissionNo: string;
      score: number | null;
      remarks: string | null;
    }>;

    if (exam.classId) {
      const students = await prisma.student.findMany({
        where: { schoolId: req.user.schoolId, classId: exam.classId, status: "ACTIVE" },
        select: { id: true, name: true, admissionNo: true },
        orderBy: { name: "asc" },
      });

      roster = students.map((s) => {
        const existing = scoresById.get(s.id);
        return {
          studentId: s.id,
          studentName: s.name,
          admissionNo: s.admissionNo,
          score: existing ? existing.score : null,
          remarks: existing ? existing.remarks : null,
        };
      });
    } else {
      roster = existingScores.map((s) => ({
        studentId: s.student.id,
        studentName: s.student.name,
        admissionNo: s.student.admissionNo,
        score: s.score,
        remarks: s.remarks,
      }));
    }

    res.json({
      examId: exam.id,
      examName: exam.name,
      subjectId: exam.subjectId,
      subjectName: exam.subject.name,
      classId: exam.classId,
      className: exam.class?.name || null,
      componentId: exam.componentId,
      componentName: exam.component?.name || null,
      maxScore: exam.maxScore,
      status: exam.status,
      date: exam.date,
      roster,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
