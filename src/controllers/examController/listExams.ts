import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { getTeacherExamScope, isAdminUser } from "../../utils/examAccess";

export const listExams = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session, subjectId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId: req.user.schoolId };
    if (term) where.term = term;
    if (session) where.session = session;
    if (term && !session) {
      where.session = await resolveSession(req.user.schoolId, term as string);
    }
    if (subjectId) where.subjectId = subjectId;

    if (!isAdminUser(req.user)) {
      const scope = await getTeacherExamScope(req.user.userId);
      if (scope.classBySubject.size === 0) {
        return res.json({ exams: [], total: 0, page, totalPages: 0 });
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.examSession.count({ where }),
    ]);

    res.json({
      exams: exams.map((e) => ({
        ...e,
        subjectName: e.subject.name,
        className: e.class?.name || null,
        componentName: e.component?.name || null,
        scoreCount: e._count.scores,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Exams");
    res.status(errorResponse.status).json(errorResponse);
  }
};
