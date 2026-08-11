import { prisma } from "./prisma";

export interface SubjectTeacher {
  subjectId: string;
  name: string;
  code: string | null;
  teacherId: string;
  teacherName: string;
}

export interface BreakInput {
  day: string;
  label: string;
  start: string;
  end: string;
}

/** Distinct subjects for a class with the first assigned teacher. */
export const getClassSubjectsWithTeachers = async (
  schoolId: string,
  classId: string,
): Promise<SubjectTeacher[]> => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      schoolId,
      type: "subject",
      classes: { some: { classId } },
    },
    select: {
      teacherId: true,
      teacher: { select: { name: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
  });

  const bySubject = new Map<string, SubjectTeacher>();
  for (const a of assignments) {
    if (!a.subject) continue;
    const sid = a.subject.id;
    if (!bySubject.has(sid)) {
      bySubject.set(sid, {
        subjectId: sid,
        name: a.subject.name,
        code: a.subject.code,
        teacherId: a.teacherId,
        teacherName: a.teacher.name,
      });
    }
  }
  return Array.from(bySubject.values());
};

/** Resolve the teacher assigned to a subject for a class (first match). */
export const resolveSubjectTeacher = async (
  schoolId: string,
  classId: string,
  subjectId: string,
): Promise<{ teacherId: string; teacherName: string } | null> => {
  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      schoolId,
      type: "subject",
      subjectId,
      classes: { some: { classId } },
    },
    select: {
      teacherId: true,
      teacher: { select: { name: true } },
    },
  });
  return assignment
    ? { teacherId: assignment.teacherId, teacherName: assignment.teacher.name }
    : null;
};

export interface BusyTeacher {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  day: string;
  startTime: string;
  endTime: string;
}

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && aEnd > bStart;

/** All teachers already booked in OTHER classes, so the scheduler can avoid them. */
export const findBusyTeachers = async (
  schoolId: string,
  excludeClassId?: string,
): Promise<BusyTeacher[]> => {
  const entries = await prisma.timetableEntry.findMany({
    where: {
      schoolId,
      ...(excludeClassId ? { NOT: { classId: excludeClassId } } : {}),
    },
    select: {
      teacherId: true,
      day: true,
      startTime: true,
      endTime: true,
      classId: true,
      teacher: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  return entries.map((e) => ({
    teacherId: e.teacherId,
    teacherName: e.teacher.name,
    classId: e.classId,
    className: e.class.name,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
  }));
};

export interface TimetableConflict {
  teacherId: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  currentClassId: string;
  currentSubjectId: string;
  clashesWithClassId: string;
  clashesWithClassName: string;
}

/** Check flat entries against teachers already booked elsewhere. */
export const findConflicts = (
  entries: Array<{
    subjectId: string;
    teacherId?: string;
    day: string;
    startTime: string;
    endTime: string;
  }>,
  busyTeachers: BusyTeacher[],
): TimetableConflict[] => {
  const conflicts: TimetableConflict[] = [];
  for (const entry of entries) {
    if (!entry.teacherId) continue;
    for (const busy of busyTeachers) {
      if (
        busy.teacherId === entry.teacherId &&
        busy.day === entry.day &&
        overlaps(entry.startTime, entry.endTime, busy.startTime, busy.endTime)
      ) {
        conflicts.push({
          teacherId: busy.teacherId,
          teacherName: busy.teacherName,
          day: entry.day,
          startTime: entry.startTime,
          endTime: entry.endTime,
          currentClassId: "",
          currentSubjectId: entry.subjectId,
          clashesWithClassId: busy.classId,
          clashesWithClassName: busy.className,
        });
      }
    }
  }
  return conflicts;
};