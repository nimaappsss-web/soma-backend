import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser, isFormTeacherOf } from "../../utils/examAccess";

/**
 * Teacher-scoped "broadcast to parents". Flips visibleToParents on the exam
 * session for a subject + class + component + term so a parent-facing read
 * endpoint can expose the scores. Deliberately does NOT touch status — scores
 * stay editable after broadcasting (the parent just sees the latest saved value).
 */
export const publishExamScores = async (req: AuthRequest, res: Response) => {
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
      // Broadcasting rights belong exclusively to the class teacher.
      const isFormTeacher = await isFormTeacherOf(req.user.userId, classId);
      if (!hasAccess || !isFormTeacher) {
        return res
          .status(403)
          .json({ error: "Only the class teacher can broadcast these results" });
      }
    }

    const exam = await prisma.examSession.findFirst({
      where: { schoolId, subjectId, classId, componentId, term, session: resolvedSession },
    });

    if (!exam) {
      return res.status(404).json({
        error: "No scores exist for this mark type yet. Save scores first, then broadcast.",
      });
    }

    const scoreCount = await prisma.examScore.count({ where: { examId: exam.id } });
    if (scoreCount === 0) {
      return res.status(400).json({
        error: "No scores exist for this mark type yet. Save scores first, then broadcast.",
      });
    }

    const updated = await prisma.examSession.update({
      where: { id: exam.id },
      data: { visibleToParents: true, lastScoreEditAt: null, lastScoreEditedBy: null },
      select: { id: true, name: true, type: true, visibleToParents: true },
    });

    res.json({
      message: "Scores are now visible to parents",
      examId: updated.id,
      name: updated.name,
      type: updated.type,
      visibleToParents: updated.visibleToParents,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Publish Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
