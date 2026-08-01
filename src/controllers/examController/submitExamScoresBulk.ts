import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";

/**
 * Offline-first bulk score submission. Accepts a subject + class + component +
 * term plus a list of student scores, finds-or-creates the DRAFT exam session
 * (same resolution as ensureExamSession), then upserts every score in one
 * idempotent request. Safe to replay — the sync queue can retry this endpoint
 * as many times as needed without side effects.
 */
export const submitExamScoresBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, classId, componentId, term, session, scores } = req.body;

    if (!subjectId || !classId || !componentId || !term) {
      return res.status(400).json({
        error: "subjectId, classId, componentId, and term are required",
      });
    }

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: "scores array is required" });
    }

    const schoolId = req.user.schoolId;

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!subject) {
      return res.status(400).json({ error: "Subject not found for this school" });
    }

    const classRecord = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!classRecord) {
      return res.status(400).json({ error: "Class not found for this school" });
    }

    const resolvedSession = await resolveSession(schoolId, term, session);

    const component = await prisma.scoreComponent.findFirst({
      where: { id: componentId, schoolId, term, session: resolvedSession },
    });
    if (!component) {
      return res.status(400).json({
        error: "Score component not found for this school and term",
      });
    }

    if (!isAdminUser(req.user)) {
      const hasAccess = await canAccessExam(req.user, { schoolId, subjectId, classId });
      if (!hasAccess) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    let exam = await prisma.examSession.findFirst({
      where: { schoolId, subjectId, classId, componentId, term, session: resolvedSession },
    });

    if (!exam) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      exam = await prisma.examSession.create({
        data: {
          schoolId,
          subjectId,
          classId,
          componentId,
          name: component.name,
          type: component.type,
          term,
          session: resolvedSession,
          maxScore: component.maxScore,
          date: today,
          status: "DRAFT",
        },
      });
    }

    if (exam.status !== "DRAFT") {
      return res.status(400).json({ error: "Scores are locked once an exam is published" });
    }

    const studentIds = scores.map((s: { studentId: string }) => s.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, classId: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s.classId]));

    for (const s of scores as Array<{ studentId: string; score: number; remarks?: string }>) {
      if (!studentMap.has(s.studentId)) {
        return res.status(400).json({ error: `Student ${s.studentId} not found` });
      }
      if (exam.classId && studentMap.get(s.studentId) !== exam.classId) {
        return res
          .status(400)
          .json({ error: `Student ${s.studentId} does not belong to this exam's class` });
      }
      const parsedScore = Number(s.score);
      if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > exam.maxScore) {
        return res
          .status(400)
          .json({ error: `Score for ${s.studentId} must be between 0 and ${exam.maxScore}` });
      }
    }

    const results = await Promise.all(
      scores.map((s: { studentId: string; score: number; remarks?: string }) =>
        prisma.examScore.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: s.studentId } },
          update: { score: Number(s.score), remarks: s.remarks || null },
          create: { examId: exam.id, studentId: s.studentId, score: Number(s.score), remarks: s.remarks || null },
        })
      )
    );

    res.json({ message: "Scores saved", count: results.length, examId: exam.id });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Exam Scores (bulk)");
    res.status(errorResponse.status).json(errorResponse);
  }
};
