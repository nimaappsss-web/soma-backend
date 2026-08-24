import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isAdminUser } from "../../utils/examAccess";
import {
  completeExamStudentIds,
  markExamResultsDelivered,
  notifyParentsOfResultRelease,
} from "../../utils/broadcastCenter";

const STATUS_FILTERS = ["PENDING", "APPROVED", "REJECTED"] as const;

const sheetInclude = {
  class: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true, image: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

/**
 * Admin-only. Lists class-level exam-sheet approvals for the school, newest
 * first, optionally filtered by status. Each row carries the number of exam
 * sessions and the number of students with a complete exam so the principal
 * can see how big the sheet is before approving.
 */
export const listExamSheetBroadcasts = async (req: AuthRequest, res: Response) => {
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

    const requests = await prisma.examSheetBroadcast.findMany({
      where: {
        schoolId,
        ...(statusParam ? { status: statusParam } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: sheetInclude,
    });

    const items = await Promise.all(
      requests.map(async (r) => {
        const [examCount, scoreCount, studentCount] = await Promise.all([
          prisma.examSession.count({
            where: { schoolId, classId: r.classId, term: r.term, session: r.session, type: "EXAM" },
          }),
          prisma.examSession
            .findMany({
              where: { schoolId, classId: r.classId, term: r.term, session: r.session, type: "EXAM" },
              select: { id: true },
            })
            .then((sessions) =>
              sessions.length > 0
                ? prisma.examScore.count({ where: { examId: { in: sessions.map((s) => s.id) } } })
                : 0,
            ),
          prisma.student.count({
            where: { schoolId, classId: r.classId, status: "ACTIVE" },
          }),
        ]);

        return {
          id: r.id,
          status: r.status,
          note: r.note,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt,
          class: r.class,
          teacher: r.teacher,
          reviewedBy: r.reviewedBy,
          term: r.term,
          session: r.session,
          examCount,
          scoreCount,
          studentCount,
        };
      }),
    );

    res.json({ requests: items });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "List Exam Sheet Broadcasts", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};

const resolveSheet = async (schoolId: string, requestId: string) => {
  const request = await prisma.examSheetBroadcast.findFirst({
    where: { id: requestId, schoolId },
    include: sheetInclude,
  });
  if (!request) {
    const err = new Error("Exam sheet broadcast request not found for this school");
    (err as any).statusCode = 404;
    throw err;
  }
  return request;
};

/**
 * Admin-only. Approves a class's exam sheet: makes every EXAM-type session for
 * the class + term visible to parents, then notifies only the students whose
 * exam result is complete and not yet delivered. Returns the delivery count so
 * the principal knows how many parents were pinged.
 */
export const approveExamSheetBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const schoolId = req.user.schoolId;
    const request = await resolveSheet(schoolId, req.params.id);

    if (request.status === "PENDING" || request.status === "REJECTED") {
      await prisma.examSession.updateMany({
        where: {
          schoolId,
          classId: request.classId,
          term: request.term,
          session: request.session,
          type: "EXAM",
        },
        data: { visibleToParents: true, lastScoreEditAt: null, lastScoreEditedBy: null },
      });
    }

    const updated = await prisma.examSheetBroadcast.update({
      where: { id: request.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: req.user.userId },
    });

    const complete = await completeExamStudentIds(
      schoolId,
      request.classId,
      request.term,
      request.session,
    );

    const delivered = await markExamResultsDelivered(
      schoolId,
      request.classId,
      request.term,
      request.session,
      complete,
    );

    if (delivered.length > 0) {
      await notifyParentsOfResultRelease(schoolId, delivered, {
        title: "Exam results released",
        message: (name) => `Term exam results for ${name} are out on Soma.`,
        route: "/parent/exams",
        data: { classId: request.classId, term: request.term, session: request.session },
      });
    }

    res.json({
      message: "Exam sheet approved. Parents can now see these exam results.",
      requestId: request.id,
      status: updated.status,
      deliveredCount: delivered.length,
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Approve Exam Sheet Broadcast", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};

/**
 * Admin-only. Rejects a class's exam sheet. Nothing is published; parents never
 * see the results. The form teacher can resubmit.
 */
export const rejectExamSheetBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const schoolId = req.user.schoolId;
    const request = await resolveSheet(schoolId, req.params.id);

    const updated = await prisma.examSheetBroadcast.update({
      where: { id: request.id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: req.user.userId },
    });

    res.json({
      message: "Exam sheet rejected. Parents won't see these results.",
      requestId: request.id,
      status: updated.status,
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Reject Exam Sheet Broadcast", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};