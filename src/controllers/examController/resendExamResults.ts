import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  resolveClassScope,
  assertFormTeacherOrAdmin,
  activeStudentsOfClass,
  completeExamStudentIds,
  markExamResultsDelivered,
  notifyParentsOfResultRelease,
} from "../../utils/broadcastCenter";

/**
 * Resends already-approved exam results to parents. Two modes:
 *
 * - No `studentIds`: only the students whose exam result is now complete but not
 *   yet delivered get pinged (the "broadcast the rest" flow — never re-notifies
 *   parents who were already sent results).
 * - `studentIds` provided: individually re-sends those specific students (e.g. a
 *   parent asked to receive the result again). No new principal approval is
 *   needed once the exam sheet is approved.
 */
export const resendExamResults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, studentIds } = req.body as {
      classId: string;
      term: string;
      session?: string;
      studentIds?: string[];
    };

    if (!classId || !term) {
      return res.status(400).json({ error: "classId and term are required" });
    }

    const schoolId = req.user.schoolId;
    const { session: resolvedSession } = await resolveClassScope(
      schoolId,
      classId,
      term,
      session,
    );

    await assertFormTeacherOrAdmin(req.user, classId);

    const sheet = await prisma.examSheetBroadcast.findUnique({
      where: {
        schoolId_classId_term_session: { schoolId, classId, term, session: resolvedSession },
      },
    });

    if (!sheet || sheet.status !== "APPROVED") {
      return res.status(400).json({
        error: "The exam sheet must be approved by the principal before results can be resent",
      });
    }

    let targetIds: string[];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const students = await activeStudentsOfClass(schoolId, classId);
      const valid = new Set(students.map((s) => s.id));
      targetIds = [...new Set(studentIds)].filter((id) => valid.has(id));
      if (targetIds.length === 0) {
        return res.status(400).json({ error: "No valid students provided to resend" });
      }
    } else {
      const complete = await completeExamStudentIds(
        schoolId,
        classId,
        term,
        resolvedSession,
      );
      const delivered = await prisma.examResultDelivery.findMany({
        where: { schoolId, classId, term, session: resolvedSession },
        select: { studentId: true },
      });
      const deliveredSet = new Set(delivered.map((d) => d.studentId));
      targetIds = complete.filter((id) => !deliveredSet.has(id));
    }

    if (targetIds.length === 0) {
      return res.json({
        message: "Nothing to resend — all completed exam results have already been sent",
        count: 0,
        studentIds: [],
      });
    }

    await markExamResultsDelivered(
      schoolId,
      classId,
      term,
      resolvedSession,
      targetIds,
    );

    await notifyParentsOfResultRelease(schoolId, targetIds, {
      title: "Exam results released",
      message: (name) => `Term exam results for ${name} are out on Soma.`,
      route: "/parent/exams",
      data: { classId, term, session: resolvedSession },
    });

    res.json({
      message: `Exam results sent to ${targetIds.length} parent${targetIds.length === 1 ? "" : "s"}`,
      count: targetIds.length,
      studentIds: targetIds,
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Resend Exam Results", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};