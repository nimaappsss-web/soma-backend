import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSchemeInfo } from "../../utils/scoreScheme";
import {
  resolveClassScope,
  assertFormTeacherOrAdmin,
  activeStudentsOfClass,
} from "../../utils/broadcastCenter";

/**
 * Class-teacher broadcast center — status read.
 *
 * Returns everything the broadcast center needs in one request: the class's CA
 * components (for the CA configuration), the per-student / per-subject CA and
 * exam matrix with completeness flags, whether a CA broadcast already happened,
 * the exam-sheet approval status, and which students' exam results have already
 * been delivered to their parents.
 */
export const broadcastStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session } = req.query as Record<string, string>;

    if (!classId || !term) {
      return res.status(400).json({ error: "classId and term are required" });
    }

    const schoolId = req.user.schoolId;
    const { classRecord, session: resolvedSession } = await resolveClassScope(
      schoolId,
      classId,
      term,
      session,
    );

    await assertFormTeacherOrAdmin(req.user, classId);

    // CA components from the class's score scheme (non-EXAM mark types).
    const scheme = await getSchemeInfo(schoolId, term, resolvedSession, classRecord.schoolType);
    const caComponents = scheme.components.filter((c) => c.type !== "EXAM");

    // All sessions for the class + term + session (CA components and terminal exam).
    const sessions = await prisma.examSession.findMany({
      where: { schoolId, classId, term, session: resolvedSession },
      include: {
        component: { select: { id: true, name: true, type: true, maxScore: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    const sessionIds = sessions.map((s) => s.id);

    const scores = sessionIds.length > 0
      ? await prisma.examScore.findMany({
          where: { examId: { in: sessionIds } },
          select: { examId: true, studentId: true, score: true },
        })
      : [];

    const scoreByStudentAndExam = new Map<string, Map<string, number>>();
    for (const s of scores) {
      let map = scoreByStudentAndExam.get(s.studentId);
      if (!map) {
        map = new Map();
        scoreByStudentAndExam.set(s.studentId, map);
      }
      map.set(s.examId, s.score);
    }

    const subjectOrder = new Map<string, string>();
    for (const s of sessions) {
      if (!subjectOrder.has(s.subjectId)) subjectOrder.set(s.subjectId, s.subject.name);
    }

    const students = await activeStudentsOfClass(schoolId, classId);

    const caSessions = sessions.filter((s) => s.type !== "EXAM");
    const examSessions = sessions.filter((s) => s.type === "EXAM");

    const caSessionsBySubject = new Map<string, typeof caSessions>();
    for (const s of caSessions) {
      let list = caSessionsBySubject.get(s.subjectId);
      if (!list) {
        list = [];
        caSessionsBySubject.set(s.subjectId, list);
      }
      list.push(s);
    }

    const examSessionBySubject = new Map<string, (typeof examSessions)[number]>();
    for (const s of examSessions) {
      if (!examSessionBySubject.has(s.subjectId)) examSessionBySubject.set(s.subjectId, s);
    }

    const studentRows = students.map((student) => {
      const myScores = scoreByStudentAndExam.get(student.id) ?? new Map<string, number>();

      const subjects = Array.from(subjectOrder.entries()).map(([subjectId, subjectName]) => {
        const caList = caSessionsBySubject.get(subjectId) ?? [];
        const exam = examSessionBySubject.get(subjectId) ?? null;

        const caComponents = caList.map((s) => ({
          componentId: s.componentId,
          componentName: s.component?.name ?? s.name,
          type: s.type,
          maxScore: s.maxScore,
          score: myScores.has(s.id) ? myScores.get(s.id)! : null,
        }));

        const caTotal = caComponents.reduce((sum, c) => sum + (c.score ?? 0), 0);
        const caComplete = caComponents.length === 0 || caComponents.every((c) => c.score !== null);

        return {
          subjectId,
          subjectName,
          caComponents,
          caTotal,
          caComplete,
          examScore: exam && myScores.has(exam.id) ? myScores.get(exam.id)! : null,
          examMaxScore: exam?.maxScore ?? null,
        };
      });

      const caMissingComponents = subjects
        .filter((s) => !s.caComplete && s.caComponents.some((c) => c.score === null))
        .map((s) => ({
          subjectName: s.subjectName,
          componentNames: s.caComponents.filter((c) => c.score === null).map((c) => c.componentName),
        }));

      const examMissingSubjects = examSessions.length > 0
        ? subjects.filter((s) => s.examScore === null).map((s) => s.subjectName)
        : [];

      return {
        studentId: student.id,
        studentName: student.name,
        admissionNo: student.admissionNo,
        subjects,
        caComplete: subjects.every((s) => s.caComplete),
        examComplete: examSessions.length > 0 && examMissingSubjects.length === 0,
        caMissingComponents,
        examMissingSubjects,
      };
    });

    const caBroadcastRecord = await prisma.caBroadcast.findUnique({
      where: { schoolId_classId_term_session: { schoolId, classId, term, session: resolvedSession } },
    });

    const examBroadcastRecord = await prisma.examSheetBroadcast.findUnique({
      where: { schoolId_classId_term_session: { schoolId, classId, term, session: resolvedSession } },
    });

    const delivered = await prisma.examResultDelivery.findMany({
      where: { schoolId, classId, term, session: resolvedSession },
      select: { studentId: true },
    });

    res.json({
      classId,
      className: classRecord.name,
      term,
      session: resolvedSession,
      components: caComponents.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        maxScore: c.maxScore,
        sortOrder: c.sortOrder,
      })),
      subjects: Array.from(subjectOrder.entries()).map(([id, name]) => ({ id, name })),
      students: studentRows,
      hasCaSessions: caSessions.length > 0,
      hasExamSessions: examSessions.length > 0,
      caBroadcast: caBroadcastRecord
        ? {
            componentIds: Array.isArray(caBroadcastRecord.componentIds)
              ? (caBroadcastRecord.componentIds as string[])
              : [],
            broadcastAt: caBroadcastRecord.broadcastAt.toISOString(),
          }
        : null,
      examBroadcast: examBroadcastRecord
        ? {
            status: examBroadcastRecord.status,
            note: examBroadcastRecord.note,
            createdAt: examBroadcastRecord.createdAt.toISOString(),
            reviewedAt: examBroadcastRecord.reviewedAt?.toISOString() ?? null,
          }
        : null,
      examDeliveredStudentIds: delivered.map((d) => d.studentId),
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Broadcast Status", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};