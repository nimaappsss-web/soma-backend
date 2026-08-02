import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";
import { parseSchoolTypes } from "../../utils/scoreScheme";

/**
 * Resolves an assessment for a subject + class + mark type (score component).
 * If it does not exist yet, it is created as a DRAFT session using the
 * component's configured name/type/maxScore and today's date. This lets
 * teachers score directly against the principal's scheme without admins
 * pre-creating assessments.
 */
export const ensureExamSession = async (req: AuthRequest, res: Response) => {
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

    const scheme = await prisma.scoreScheme.findFirst({
      where: { id: component.schemeId },
      select: { schoolTypes: true },
    });
    const covered = scheme ? parseSchoolTypes(scheme.schoolTypes) : [];
    if (!covered.includes(classRecord.schoolType)) {
      return res.status(400).json({
        error: `This configuration does not apply to ${classRecord.name} (${classRecord.schoolType})`,
      });
    }

    if (!isAdminUser(req.user)) {
      const hasAccess = await canAccessExam(req.user, { schoolId, subjectId, classId });
      if (!hasAccess) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    const include = {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      component: { select: { id: true, name: true, maxScore: true } },
      _count: { select: { scores: true } },
    } as const;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const exam = await prisma.examSession.upsert({
      where: {
        schoolId_subjectId_classId_componentId_term_session: {
          schoolId,
          subjectId,
          classId,
          componentId,
          term,
          session: resolvedSession,
        },
      },
      update: {},
      create: {
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
      include,
    });

    res.json({
      exam: {
        ...exam,
        subjectName: exam.subject.name,
        className: exam.class?.name || null,
        componentName: exam.component?.name || null,
        scoreCount: exam._count.scores,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Ensure Exam Session");
    res.status(errorResponse.status).json(errorResponse);
  }
};
