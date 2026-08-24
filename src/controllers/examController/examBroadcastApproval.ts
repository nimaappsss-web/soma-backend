import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isAdminUser } from "../../utils/examAccess";

const STATUS_FILTERS = ["PENDING", "APPROVED", "REJECTED"] as const;

const broadcastInclude = {
  exam: {
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      component: { select: { id: true, name: true, type: true } },
    },
  },
  teacher: { select: { id: true, name: true, image: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

/**
 * Admin-only. Lists teacher exam broadcasts for the school, newest first,
 * optionally filtered by status. Each entry carries the student count so the
 * principal knows how big the class is before approving.
 */
export const listExamBroadcasts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const schoolId = req.user.schoolId;
    const statusParam = (req.query.status as string | undefined)?.toUpperCase() ?? "";

    if (statusParam && !STATUS_FILTERS.includes(statusParam as (typeof STATUS_FILTERS)[number])) {
      return res.status(400).json({ error: "Invalid status filter" });
    }

    const requests = await prisma.examBroadcastRequest.findMany({
      where: {
        schoolId,
        ...(statusParam ? { status: statusParam } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: broadcastInclude,
    });

    const examIds = requests.map((r) => r.examId);
    const scoreCounts = examIds.length > 0
      ? await prisma.examScore.groupBy({
          by: ["examId"],
          where: { examId: { in: examIds } },
          _count: { _all: true },
        })
      : [];
    const countByExam = new Map(scoreCounts.map((s) => [s.examId, s._count._all]));

    res.json({
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        teacher: r.teacher,
        reviewedBy: r.reviewedBy,
        exam: {
          id: r.exam.id,
          name: r.exam.name,
          type: r.exam.type,
          term: r.exam.term,
          session: r.exam.session,
          maxScore: r.exam.maxScore,
          date: r.exam.date,
          visibleToParents: r.exam.visibleToParents,
          subject: r.exam.subject,
          class: r.exam.class,
          component: r.exam.component,
          scoreCount: countByExam.get(r.exam.id) ?? 0,
        },
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Exam Broadcasts");
    res.status(errorResponse.status).json(errorResponse);
  }
};

const resolveBroadcast = async (schoolId: string, requestId: string) => {
  const request = await prisma.examBroadcastRequest.findFirst({
    where: { id: requestId, schoolId },
    include: broadcastInclude,
  });
  if (!request) throw new Error("Broadcast request not found for this school");
  return request;
};

/**
 * Admin-only. Approves a teacher's exam broadcast: flips visibleToParents on the
 * exam session and marks the request APPROVED so parents can see the report card.
 */
export const approveExamBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const schoolId = req.user.schoolId;
    const request = await resolveBroadcast(schoolId, req.params.id);

    const [, updatedRequest] = await prisma.$transaction([
      prisma.examSession.update({
        where: { id: request.examId },
        data: { visibleToParents: true, lastScoreEditAt: null, lastScoreEditedBy: null },
      }),
      prisma.examBroadcastRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: req.user.userId },
      }),
    ]);

    res.json({
      message: "Broadcast approved. Parents can now see this exam result.",
      requestId: updatedRequest.id,
      status: updatedRequest.status,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Approve Exam Broadcast");
    res.status(errorResponse.status).json(errorResponse);
  }
};

/**
 * Admin-only. Rejects a teacher's exam broadcast. visibleToParents stays false
 * so parents never see the result until it is approved.
 */
export const rejectExamBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const schoolId = req.user.schoolId;
    const request = await resolveBroadcast(schoolId, req.params.id);

    const updatedRequest = await prisma.examBroadcastRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: req.user.userId },
    });

    res.json({
      message: "Broadcast rejected. Parents won't see this exam result.",
      requestId: updatedRequest.id,
      status: updatedRequest.status,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Reject Exam Broadcast");
    res.status(errorResponse.status).json(errorResponse);
  }
};
