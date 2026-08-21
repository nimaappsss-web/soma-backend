import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  resolveClassScope,
  assertFormTeacherOrAdmin,
} from "../../utils/broadcastCenter";

/**
 * Form teacher submits the whole class's terminal-exam sheet for principal
 * approval. This is a class-level request ("Exam sheet approval"), separate
 * from the per-mark-type ExamBroadcastRequest flow. Once approved, the exam
 * results become visible to parents and per-student delivery tracking begins.
 */
export const submitExamSheet = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, note } = req.body as {
      classId: string;
      term: string;
      session?: string;
      note?: string;
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

    const examSessions = await prisma.examSession.findMany({
      where: { schoolId, classId, term, session: resolvedSession, type: "EXAM" },
      select: { id: true },
    });

    if (examSessions.length === 0) {
      return res.status(400).json({
        error: "No exam scores to submit. Save exam scores first, then submit the exam sheet for approval.",
      });
    }

    const scoreCount = await prisma.examScore.count({
      where: { examId: { in: examSessions.map((s) => s.id) } },
    });

    if (scoreCount === 0) {
      return res.status(400).json({
        error: "No exam scores to submit. Save exam scores first, then submit the exam sheet for approval.",
      });
    }

    const existing = await prisma.examSheetBroadcast.findUnique({
      where: {
        schoolId_classId_term_session: { schoolId, classId, term, session: resolvedSession },
      },
    });

    if (existing?.status === "APPROVED") {
      return res.status(400).json({
        error: "This exam sheet is already approved. Use 'Resend' to share results with parents again.",
      });
    }

    const record = existing
      ? await prisma.examSheetBroadcast.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            note: note ?? null,
            teacherId: req.user.userId,
            reviewedAt: null,
            reviewedById: null,
          },
        })
      : await prisma.examSheetBroadcast.create({
          data: {
            schoolId,
            classId,
            term,
            session: resolvedSession,
            status: "PENDING",
            note: note ?? null,
            teacherId: req.user.userId,
          },
        });

    res.json({
      message: "Exam sheet submitted for principal approval",
      requestId: record.id,
      status: record.status,
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Submit Exam Sheet", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};