import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";

/**
 * Teacher-scoped "hide from parents" — the inverse of publish. Flips
 * visibleToParents back to false so a mistakenly released broadcast can be
 * pulled back. For terminal exams that were already approved, the broadcast
 * request is reset to PENDING so it needs re-approval to become visible again
 * ("APPROVED" always means "currently visible to parents").
 */
export const unpublishExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, classId, componentId, term, session } = req.body;

    if (!subjectId || !classId || !componentId || !term) {
      return res.status(400).json({
        error: "subjectId, classId, componentId, and term are required",
      });
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

    const exam = await prisma.examSession.findFirst({
      where: { schoolId, subjectId, classId, componentId, term, session: resolvedSession },
    });

    if (!exam) {
      return res.status(404).json({ error: "No exam session found for this mark type." });
    }

    await prisma.$transaction([
      prisma.examSession.update({
        where: { id: exam.id },
        data: { visibleToParents: false },
      }),
      // If this was an approved terminal exam, route it back through approval.
      prisma.examBroadcastRequest.updateMany({
        where: { examId: exam.id, status: "APPROVED" },
        data: { status: "PENDING", reviewedAt: null, reviewedById: null },
      }),
    ]);

    res.json({
      message: "Hidden from parents",
      examId: exam.id,
      visibleToParents: false,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Unpublish Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};