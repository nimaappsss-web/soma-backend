import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { canAccessExam, isAdminUser } from "../../utils/examAccess";
import { notifyUser, notifyMany } from "../../utils/notifications";

/**
 * Offline-first bulk score submission. Accepts a subject + class + component +
 * term plus a list of student scores, finds-or-creates the DRAFT exam session
 * (same resolution as ensureExamSession), then upserts every score in one
 * idempotent request. Safe to replay — the sync queue can retry this endpoint
 * as many times as needed without side effects.
 */
export const submitExamScoresBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, classId, componentId, term, session, scores } = req.body;

    if (!subjectId || !classId || !componentId || !term) {
      return res.status(400).json({
        error: "subjectId, classId, componentId, and term are required",
      });
    }

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: "scores array is required" });
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
      if (!hasAccess) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

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
    });

    if (exam.status !== "DRAFT") {
      return res.status(400).json({ error: "Scores are locked once an exam is published" });
    }

    const studentIds = scores.map((s: { studentId: string }) => s.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, classId: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s.classId]));

    for (const s of scores as Array<{ studentId: string; score: number; remarks?: string }>) {
      if (!studentMap.has(s.studentId)) {
        return res.status(400).json({ error: `Student ${s.studentId} not found` });
      }
      if (exam.classId && studentMap.get(s.studentId) !== exam.classId) {
        return res
          .status(400)
          .json({ error: `Student ${s.studentId} does not belong to this exam's class` });
      }
      const parsedScore = Number(s.score);
      if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > exam.maxScore) {
        return res
          .status(400)
          .json({ error: `Score for ${s.studentId} must be between 0 and ${exam.maxScore}` });
      }
    }

    // Detect whether this save actually changes anything. The sync queue can
    // replay this endpoint, so downstream notifications/re-approval must only
    // fire when a score value really changed.
    const existingScores = await prisma.examScore.findMany({
      where: { examId: exam.id, studentId: { in: studentIds } },
      select: { studentId: true, score: true },
    });
    const existingByStudent = new Map(existingScores.map((e) => [e.studentId, e.score]));
    const hasChanges = (scores as Array<{ studentId: string; score: number }>).some(
      (s) => existingByStudent.get(s.studentId) !== Number(s.score),
    );

    const results = await Promise.all(
      scores.map((s: { studentId: string; score: number; remarks?: string }) =>
        prisma.examScore.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: s.studentId } },
          update: { score: Number(s.score), remarks: s.remarks || null },
          create: { examId: exam.id, studentId: s.studentId, score: Number(s.score), remarks: s.remarks || null },
        })
      )
    );

    let requiresReapproval = false;

    // Post-broadcast edit tracking. Parents' results are computed live from
    // ExamScore rows, so once visibleToParents is set every edit goes straight
    // to them — these guards keep the broadcast owner in the loop.
    if (hasChanges) {
      const [editor, formTeacher] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } }),
        prisma.user.findFirst({ where: { schoolId, formClassId: classId }, select: { id: true } }),
      ]);
      const editorName = editor?.name || "A teacher";
      const editedByClassTeacher = !!formTeacher && formTeacher.id === req.user.userId;

      // Stamp out-of-band edits so the Broadcast tab can badge them, until the
      // class teacher (or an admin) next broadcasts/reviews.
      if (!editedByClassTeacher && formTeacher) {
        await prisma.examSession.update({
          where: { id: exam.id },
          data: { lastScoreEditAt: new Date(), lastScoreEditedBy: editorName },
        });
      }

      if (!exam.visibleToParents) {
        // Sheet submitted but not yet visible? Give the form teacher a heads-up
        // before the principal reviews stale marks.
        if (exam.type === "EXAM" && !editedByClassTeacher && formTeacher) {
          const sheet = await prisma.examSheetBroadcast.findUnique({
            where: {
              schoolId_classId_term_session: { schoolId, classId, term, session: exam.session },
            },
            select: { status: true },
          });
          if (sheet && sheet.status !== "APPROVED") {
            await notifyUser(schoolId, formTeacher.id, {
              title: "Scores updated in a submitted sheet",
              message: `${editorName} changed ${subject.name} (${exam.name}) scores for ${classRecord.name} after you submitted the sheet for approval.`,
              type: "EXAM",
              route: "/teach/ca-and-exams/broadcast",
              data: { examId: exam.id },
            });
          }
        }
      } else if (exam.type === "EXAM") {
        // Approved exam results must not change silently. Hide them again and
        // send the sheet back to PENDING so the principal re-approves.
        const request = await prisma.examBroadcastRequest.findUnique({
          where: { examId: exam.id },
          select: { id: true, status: true },
        });

        if (request?.status === "APPROVED") {
          await prisma.$transaction([
            prisma.examSession.update({
              where: { id: exam.id },
              data: { visibleToParents: false },
            }),
            prisma.examBroadcastRequest.update({
              where: { id: request.id },
              data: { status: "PENDING", reviewedAt: null, reviewedById: null },
            }),
          ]);
          requiresReapproval = true;

          if (formTeacher && !editedByClassTeacher) {
            await notifyUser(schoolId, formTeacher.id, {
              title: "Exam scores edited after approval",
              message: `${editorName} updated ${subject.name} (${exam.name}) scores for ${classRecord.name}. The result was hidden and needs re-approval.`,
              type: "EXAM",
              route: "/teach/ca-and-exams/broadcast",
              data: { examId: exam.id },
            });
          }

          const admins = await prisma.user.findMany({
            where: { schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
            select: { id: true },
          });
          await notifyMany(
            schoolId,
            admins.map((a) => a.id).filter((id) => id !== req.user!.userId),
            {
              title: "Exam scores edited after approval",
              message: `${editorName} updated ${subject.name} (${exam.name}) scores for ${classRecord.name}. Re-approval is required before parents see the changes.`,
              type: "EXAM",
              route: "/admin/approvals",
              data: { examId: exam.id },
            },
          );
        }
      } else {
        // CA keeps live sync, but the class teacher owns the broadcast — flag
        // her when someone else edits scores that parents are already seeing.
        if (formTeacher && !editedByClassTeacher) {
          await notifyUser(schoolId, formTeacher.id, {
            title: "Scores edited after broadcast",
            message: `${editorName} updated ${component.name} scores for ${classRecord.name} that are currently visible to parents.`,
            type: "EXAM",
            route: "/teach/ca-and-exams/broadcast",
            data: { examId: exam.id },
          });
        }
      }
    }

    res.json({ message: "Scores saved", count: results.length, examId: exam.id, requiresReapproval });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Submit Exam Scores (bulk)");
    res.status(errorResponse.status).json(errorResponse);
  }
};
