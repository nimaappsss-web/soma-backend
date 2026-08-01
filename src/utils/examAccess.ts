import { prisma } from "./prisma";
import { JwtPayload } from "./jwt";

export const isAdminUser = (user: JwtPayload): boolean =>
  ["PRINCIPAL", "SCHOOL_ADMIN"].includes(user.role);

export interface AccessibleExam {
  schoolId: string;
  subjectId: string;
  classId: string | null;
}

/**
 * Admins may access any exam. Teachers may access exams for a subject they are
 * assigned to; when the exam is class-scoped, the teacher must also be assigned
 * to that class.
 */
export const canAccessExam = async (
  user: JwtPayload,
  exam: AccessibleExam,
): Promise<boolean> => {
  if (isAdminUser(user)) return true;
  if (!user.schoolId || exam.schoolId !== user.schoolId) return false;

  const where: any = {
    teacherId: user.userId,
    type: "subject",
    subjectId: exam.subjectId,
  };
  if (exam.classId) {
    where.classes = { some: { classId: exam.classId } };
  }

  const assignment = await prisma.teacherAssignment.findFirst({ where });
  return !!assignment;
};

export interface TeacherExamScope {
  subjectIds: Set<string>;
  classBySubject: Map<string, Set<string | null>>;
}

/**
 * The set of subjects (and per-subject classes) a teacher may see exams for.
 * An exam with a null classId is visible if the teacher teaches the subject at
 * all; a class-scoped exam requires the teacher to be assigned that class.
 */
export const getTeacherExamScope = async (
  userId: string,
): Promise<TeacherExamScope> => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: userId, type: "subject", subjectId: { not: null } },
    select: { subjectId: true, classes: { select: { classId: true } } },
  });

  const subjectIds = new Set<string>();
  const classBySubject = new Map<string, Set<string | null>>();

  for (const a of assignments) {
    if (!a.subjectId) continue;
    subjectIds.add(a.subjectId);
    const set = classBySubject.get(a.subjectId) || new Set<string | null>();
    if (a.classes.length === 0) {
      set.add(null);
    } else {
      for (const c of a.classes) set.add(c.classId);
    }
    classBySubject.set(a.subjectId, set);
  }

  return { subjectIds, classBySubject };
};
