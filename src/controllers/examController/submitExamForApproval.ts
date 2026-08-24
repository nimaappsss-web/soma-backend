import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser, isFormTeacherOf } from "../../utils/examAccess";
import { notifyMany } from "../../utils/notifications";

/**
 * Teacher submits a terminal exam session for principal approval so its
 * results can eventually be shown to parents as a report card. Only EXAM-type
 * sessions go through approval — CA components broadcast directly.
 * Re-submitting an already-approved/rejected session returns it to PENDING.
 */
export const submitExamForApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, classId, componentId, term, session, note } = req.body;

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

    if (component.type !== "EXAM") {
      return res.status(400).json({
        error: "Only terminal exams need approval. Tests and other CA components broadcast directly.",
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
        error: "No exam session found. Save scores first, then submit for approval.",
      });
    }

    const scoreCount = await prisma.examScore.count({ where: { examId: exam.id } });
    if (scoreCount === 0) {
      return res.status(400).json({
        error: "No scores exist for this exam yet. Save scores first, then submit for approval.",
      });
    }

    const existing = await prisma.examBroadcastRequest.findUnique({
      where: { examId: exam.id },
    });

    // Resubmission means the broadcast owner has acknowledged any edits.
    await prisma.examSession.update({
      where: { id: exam.id },
      data: { lastScoreEditAt: null, lastScoreEditedBy: null },
    });

    const request = existing
      ? await prisma.examBroadcastRequest.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            note: note ?? null,
            teacherId: req.user.userId,
            reviewedAt: null,
            reviewedById: null,
          },
        })
      : await prisma.examBroadcastRequest.create({
          data: {
            schoolId,
            examId: exam.id,
            teacherId: req.user.userId,
            status: "PENDING",
            note: note ?? null,
          },
        });

    // Ping the principals so they know a submission is waiting for review.
    const admins = await prisma.user.findMany({
      where: { schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
      select: { id: true },
    });
    if (admins.length > 0) {
      const submitter = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { name: true },
      });
      await notifyMany(
        schoolId,
        admins.map((a) => a.id).filter((id) => id !== req.user!.userId),
        {
          title: "Exam results awaiting approval",
          message: `${submitter?.name || "A teacher"} submitted ${subject.name} (${component.name}) exam results for ${classRecord.name}.`,
          type: "EXAM",
          route: "/admin/approvals",
          data: { requestId: request.id, examId: exam.id },
        },
      );
    }

    res.json({
      message: "Exam submitted for approval",
      requestId: request.id,
      status: request.status,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Exam For Approval");
    res.status(errorResponse.status).json(errorResponse);
  }
};
