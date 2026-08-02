import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";

/**
 * Offline-first bulk score delete. Mirrors the scope of POST /exams/scores —
 * given subject + class + component + term (and optional session), deletes all
 * saved scores for that mark type. Only DRAFT sessions can be cleared so
 * published exams can't be mutated. Safe to replay; the sync queue can retry
 * this endpoint as many times as needed without side effects.
 */
export const deleteExamScoresBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, classId, componentId, term, session } = req.query as Record<string, string>;

    if (!subjectId || !classId || !componentId || !term) {
      return res
        .status(400)
        .json({ error: "subjectId, classId, componentId, and term are required" });
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

    if (!isAdminUser(req.user)) {
      const hasAccess = await canAccessExam(req.user, { schoolId, subjectId, classId });
      if (!hasAccess) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    const exams = await prisma.examSession.findMany({
      where: { schoolId, subjectId, classId, componentId, term, session: resolvedSession },
      select: { id: true, status: true },
    });

    if (exams.some((e) => e.status !== "DRAFT")) {
      return res.status(400).json({ error: "Scores are locked once an exam is published" });
    }

    if (exams.length === 0) {
      return res.json({ message: "No scores found", count: 0 });
    }

    const examIds = exams.map((e) => e.id);
    const result = await prisma.examScore.deleteMany({
      where: { examId: { in: examIds } },
    });

    res.json({ message: "Scores deleted", count: result.count });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Exam Scores (bulk)");
    res.status(errorResponse.status).json(errorResponse);
  }
};
