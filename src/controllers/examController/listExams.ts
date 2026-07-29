import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

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
    if (subjectId) where.subjectId = subjectId;

    const [exams, total] = await Promise.all([
      prisma.examSession.findMany({
        where,
        include: { subject: { select: { id: true, name: true } }, _count: { select: { scores: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.examSession.count({ where }),
    ]);

    res.json({
      exams: exams.map((e) => ({ ...e, subjectName: e.subject.name, scoreCount: e._count.scores })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Exams");
    res.status(errorResponse.status).json(errorResponse);
  }
};
