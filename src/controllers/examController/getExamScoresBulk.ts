import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";

/**
 * Bulk score read for offline-first restore. Mirrors the scope of
 * POST /exams/scores — given subject + class + component + term (and
 * optional session), returns the latest matching exam session's scores.
 * Returns an empty scores array when nothing has been saved yet.
 */
export const getExamScoresBulk = async (req: AuthRequest, res: Response) => {
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

    const exam = await prisma.examSession.findFirst({
      where: { schoolId, subjectId, classId, componentId, term, session: resolvedSession },
      include: { broadcastRequest: { select: { status: true } } },
    });

    if (!exam) {
      return res.json({ message: "No scores found", scores: [], examId: "" });
    }

    const scoreRows = await prisma.examScore.findMany({
      where: { examId: exam.id },
      select: { studentId: true, score: true, remarks: true },
    });

    res.json({
      message: "Scores found",
      scores: scoreRows.map((row) => ({
        studentId: row.studentId,
        score: row.score,
        remarks: row.remarks,
      })),
      examId: exam.id,
      visibleToParents: exam.visibleToParents,
      broadcastStatus: exam.broadcastRequest?.status ?? null,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Exam Scores (bulk)");
    res.status(errorResponse.status).json(errorResponse);
  }
};
