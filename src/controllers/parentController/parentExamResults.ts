import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";
import { normalizeTerm, resolveSession, sessionFromStartDate } from "../../utils/academicTerm";

const TERM_SPELLINGS: Record<string, string[]> = {
  "1": ["1", "1st", "first"],
  "2": ["2", "2nd", "second"],
  "3": ["3", "3rd", "third"],
};

const termVariants = (term: string): string[] => {
  const normalized = normalizeTerm(term);
  const key = normalized ?? term;
  return TERM_SPELLINGS[key] ?? [term, normalized].filter(Boolean) as string[];
};

/**
 * Parent-facing exam/test results. Returns, for each of the parent's linked
 * children, the test/exam scores the teachers have explicitly broadcast
 * (ExamSession.visibleToParents = true). CA components (Test 1, Test 2, ...)
 * and the terminal exam are split so the UI can show either side by side.
 */
export const parentExamResults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { term, session } = req.query as Record<string, string>;

    // Resolve term: explicit, else the school's current/active term.
    let resolvedTerm = term ? normalizeTerm(term) ?? term : term;
    let resolvedSession = session ?? "";

    const now = new Date();
    if (!resolvedTerm) {
      const current = await prisma.academicTerm.findFirst({
        where: { schoolId, startDate: { lte: now }, endDate: { gte: now } },
        select: { term: true, startDate: true },
      });
      resolvedTerm = current?.term ?? "";
      if (current) resolvedSession = sessionFromStartDate(current.startDate);
    }

    if (resolvedTerm && !resolvedSession) {
      resolvedSession = await resolveSession(schoolId, resolvedTerm);
    }

    if (!resolvedTerm) {
      return res.json({ term: "", session: "", children: [] });
    }

    const studentIds = await studentIdsForParent(schoolId, req.user.userId);

    if (studentIds.length === 0) {
      return res.json({ term: resolvedTerm, session: resolvedSession, children: [] });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        classId: true,
        class: { select: { id: true, name: true } },
      },
    });

    const classIds = [...new Set(students.map((s) => s.classId).filter(Boolean))] as string[];

    const publishedSessions = classIds.length > 0
      ? await prisma.examSession.findMany({
          where: {
            schoolId,
            classId: { in: classIds },
            term: { in: termVariants(resolvedTerm) },
            ...(resolvedSession ? { session: resolvedSession } : {}),
            visibleToParents: true,
          },
          include: {
            subject: { select: { id: true, name: true } },
            component: { select: { id: true, name: true } },
          },
        })
      : [];

    const sessionIds = publishedSessions.map((s) => s.id);
    const scores = sessionIds.length > 0
      ? await prisma.examScore.findMany({
          where: { examId: { in: sessionIds }, studentId: { in: studentIds } },
          select: { examId: true, studentId: true, score: true },
        })
      : [];

    const sessionById = new Map(publishedSessions.map((s) => [s.id, s]));
    const scoresByStudent = new Map<string, Map<string, {
      subjectId: string;
      subjectName: string;
      components: { componentId: string | null; name: string; type: string; score: number; maxScore: number }[];
      caTotal: number;
      examScore: number | null;
      examMaxScore: number | null;
      total: number;
    }>>();

    for (const score of scores) {
      const exam = sessionById.get(score.examId);
      if (!exam) continue;

      let subjects = scoresByStudent.get(score.studentId);
      if (!subjects) {
        subjects = new Map();
        scoresByStudent.set(score.studentId, subjects);
      }

      let entry = subjects.get(exam.subjectId);
      if (!entry) {
        entry = {
          subjectId: exam.subjectId,
          subjectName: exam.subject.name,
          components: [],
          caTotal: 0,
          examScore: null,
          examMaxScore: null,
          total: 0,
        };
        subjects.set(exam.subjectId, entry);
      }

      if (exam.type === "EXAM") {
        entry.examScore = score.score;
        entry.examMaxScore = exam.maxScore;
      } else {
        entry.components.push({
          componentId: exam.componentId,
          name: exam.component?.name ?? exam.name,
          type: exam.type,
          score: score.score,
          maxScore: exam.maxScore,
        });
        entry.caTotal += score.score;
      }
      entry.total = entry.caTotal + (entry.examScore ?? 0);
    }

    const children = students.map((student) => {
      const studentSubjects = scoresByStudent.get(student.id);
      const subjects = studentSubjects ? Array.from(studentSubjects.values()) : [];
      subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      return {
        studentId: student.id,
        studentName: student.name,
        admissionNo: student.admissionNo,
        classId: student.classId,
        className: student.class?.name ?? null,
        subjects,
      };
    });

    res.json({
      term: resolvedTerm,
      session: resolvedSession,
      children,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Parent Exam Results");
    res.status(errorResponse.status).json(errorResponse);
  }
};
