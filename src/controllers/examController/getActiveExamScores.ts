import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getTeacherExamScope, isAdminUser } from "../../utils/examAccess";

const LIMIT = 25;

/**
 * Returns the teacher's scored assessments (exam sessions with at least one
 * saved score) as lean card summaries — the data needed to render the Active
 * Assessments list. Per-student scores are NOT included here; they are fetched
 * on demand when a teacher opens an assessment.
 */
export const getActiveExamScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { term, classId, subjectId } = req.query as Record<string, string>;

    const where: any = { schoolId, scores: { some: {} } };
    if (term) where.term = term;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (!isAdminUser(req.user)) {
      const scope = await getTeacherExamScope(req.user.userId);
      if (scope.classBySubject.size === 0) {
        return res.json({ exams: [], total: 0 });
      }
      const ors: any[] = [];
      for (const [subjectIdKey, classes] of scope.classBySubject.entries()) {
        const classList = Array.from(classes).filter((c) => c !== null);
        const cond: any = { subjectId: subjectIdKey };
        if (classList.length > 0) {
          cond.OR = [{ classId: null }, { classId: { in: classList } }];
        }
        ors.push(cond);
      }
      where.AND = { OR: ors };
    }

    const [exams, total] = await Promise.all([
      prisma.examSession.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          component: { select: { id: true, name: true } },
          _count: { select: { scores: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
      }),
      prisma.examSession.count({ where }),
    ]);

    res.json({
      exams: exams.map((e) => ({
        examKey:
          e.classId && e.componentId
            ? `${e.subjectId}:${e.classId}:${e.componentId}:${e.term}`
            : null,
        subjectId: e.subjectId,
        subjectName: e.subject.name,
        classId: e.classId,
        className: e.class?.name || null,
        componentId: e.componentId,
        componentName: e.component?.name || null,
        type: e.type,
        maxScore: e.maxScore,
        term: e.term,
        session: e.session,
        scoreCount: e._count.scores,
        updatedAt: e.updatedAt,
      })),
      total,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Active Exam Scores");
    res.status(errorResponse.status).json(errorResponse);
  }
};
