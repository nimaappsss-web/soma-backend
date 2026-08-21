import { prisma } from "./prisma";
import { resolveSession } from "./academicTerm";
import { isAdminUser } from "./examAccess";
import { notifyMany, parentUserIdsForStudents } from "./notifications";
import { JwtPayload } from "./jwt";

/**
 * Broadcast-center helpers shared by the class-teacher broadcast endpoints
 * (CA broadcast, exam-sheet approval, exam-result resend).
 */

export const throwError = (message: string, statusCode = 400) => {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  throw err;
};

/** Resolves the session for a school + term + optional session, and confirms the class exists. */
export const resolveClassScope = async (
  schoolId: string,
  classId: string,
  term: string,
  session?: string,
) => {
  const resolvedSession = await resolveSession(schoolId, term, session);

  const classRecord = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, schoolType: true },
  });

  if (!classRecord) throwError("Class not found", 404);

  return { classRecord: classRecord!, session: resolvedSession };
};

/**
 * Only the form teacher of the class (or an admin) may broadcast / review a
 * class's results from the broadcast center.
 */
export const assertFormTeacherOrAdmin = async (
  user: JwtPayload,
  classId: string,
) => {
  if (isAdminUser(user)) return;

  const teacher = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { formClassId: true },
  });

  if (!teacher?.formClassId || teacher.formClassId !== classId) {
    throwError("Only the form teacher of this class can broadcast results", 403);
  }
};

/** ACTIVE students of a class, sorted by name. */
export const activeStudentsOfClass = async (schoolId: string, classId: string) =>
  prisma.student.findMany({
    where: { schoolId, classId, status: "ACTIVE" },
    select: { id: true, name: true, admissionNo: true },
    orderBy: { name: "asc" },
  });

/**
 * Students whose terminal-exam result is "complete": they have a score in every
 * EXAM-type session for the class + term + session.
 */
export const completeExamStudentIds = async (
  schoolId: string,
  classId: string,
  term: string,
  session: string,
): Promise<string[]> => {
  const sessions = await prisma.examSession.findMany({
    where: { schoolId, classId, term, session, type: "EXAM" },
    select: { id: true },
  });

  if (sessions.length === 0) return [];

  const scores = await prisma.examScore.findMany({
    where: {
      examId: { in: sessions.map((s) => s.id) },
      student: { schoolId, classId },
    },
    select: { studentId: true, examId: true },
  });

  const scoredByStudent = new Map<string, Set<string>>();
  for (const s of scores) {
    let set = scoredByStudent.get(s.studentId);
    if (!set) {
      set = new Set();
      scoredByStudent.set(s.studentId, set);
    }
    set.add(s.examId);
  }

  const students = await activeStudentsOfClass(schoolId, classId);

  return students
    .filter((st) => {
      const set = scoredByStudent.get(st.id);
      return !!set && set.size === sessions.length;
    })
    .map((st) => st.id);
};

/** Marks a set of students' exam results as delivered (idempotent). */
export const markExamResultsDelivered = async (
  schoolId: string,
  classId: string,
  term: string,
  session: string,
  studentIds: string[],
) => {
  const existing = await prisma.examResultDelivery.findMany({
    where: { schoolId, classId, term, session, studentId: { in: studentIds } },
    select: { studentId: true },
  });

  const already = new Set(existing.map((r) => r.studentId));
  const fresh = studentIds.filter((id) => !already.has(id));

  if (fresh.length > 0) {
    await prisma.examResultDelivery.createMany({
      data: fresh.map((studentId) => ({ schoolId, classId, term, session, studentId })),
    });
  }

  return fresh;
};

/** Sends each linked parent an in-app notification that a result is out. */
export const notifyParentsOfResultRelease = async (
  schoolId: string,
  studentIds: string[],
  opts: {
    title: string;
    message: (studentName: string) => string;
    route: string;
    data?: Record<string, unknown>;
  },
) => {
  for (const studentId of studentIds) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    if (!student) continue;

    const parentIds = await parentUserIdsForStudents(schoolId, [studentId]);
    if (parentIds.length === 0) continue;

    await notifyMany(schoolId, parentIds, {
      title: opts.title,
      message: opts.message(student.name),
      type: "EXAM",
      route: opts.route,
      data: { ...(opts.data ?? {}), studentName: student.name },
    });
  }
};