import { prisma } from "./prisma";
import { toUtcDateString, isWeekend } from "./attendanceAvailability";

export interface DayAbsentee {
  studentId: string;
  studentName: string;
  gender: string | null;
  admissionNo: string;
  teacherName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

export interface DayByClass {
  classId: string;
  className: string;
  total: number;
  present: number;
  absent: number;
  note: string | null;
  absentees: DayAbsentee[];
}

export interface DayAttendanceSummary {
  date: string;
  dayOfWeek: string;
  isHoliday: boolean;
  isWeekend: boolean;
  totalStudents: number;
  present: number;
  absent: number;
  percentage: number;
  totalClasses: number;
  classesMarked: number;
  byClass: DayByClass[];
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Aggregates attendance for a single day at school scope (optionally a single
 * class). Used by the analytics summary/detail endpoints and the dashboard.
 */
export const getDayAttendanceSummary = async (
  schoolId: string,
  date: Date,
  options: { classId?: string; includeAbsentees?: boolean; capAbsentees?: number } = {},
): Promise<DayAttendanceSummary> => {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(day);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const dateStr = toUtcDateString(day);
  const dayOfWeek = day.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const classWhere = options.classId ? { id: options.classId } : {};
  const attendanceWhere = options.classId ? { classId: options.classId } : {};

  const [holiday, classes, attendanceRecords, dayNotes] = await Promise.all([
    prisma.holiday.findFirst({ where: { schoolId, date: day } }),
    prisma.class.findMany({ where: { schoolId, ...classWhere }, select: { id: true, name: true } }),
    prisma.attendance.findMany({
      where: {
        student: { schoolId, status: "ACTIVE" },
        date: { gte: day, lt: tomorrow },
        ...attendanceWhere,
      },
      select: { studentId: true, classId: true, status: true },
    }),
    prisma.attendanceNote.findMany({
      where: { schoolId, date: day, ...attendanceWhere },
      select: { classId: true, note: true },
    }),
  ]);

  const isHoliday = !!holiday;
  const noteByClass = new Map(dayNotes.map((n) => [n.classId, n.note]));

  const recordsByClass = new Map<string, { present: number; absentStudentIds: string[] }>();
  for (const r of attendanceRecords) {
    const entry = recordsByClass.get(r.classId) || { present: 0, absentStudentIds: [] };
    if (r.status === "present") entry.present += 1;
    else if (r.status === "absent") entry.absentStudentIds.push(r.studentId);
    recordsByClass.set(r.classId, entry);
  }

  const classTotals = await prisma.student.groupBy({
    by: ["classId"],
    where: { schoolId, status: "ACTIVE", ...attendanceWhere },
    _count: { _all: true },
  });
  const totalByClass = new Map(classTotals.map((c) => [c.classId, c._count._all]));

  const allAbsentIds = [...new Set(attendanceRecords.filter((r) => r.status === "absent").map((r) => r.studentId))];
  const absentStudents = allAbsentIds.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: allAbsentIds }, schoolId },
        select: {
          id: true,
          name: true,
          gender: true,
          admissionNo: true,
          parentName: true,
          parentPhone: true,
          parentEmail: true,
        },
      })
    : [];
  const studentById = new Map(absentStudents.map((s) => [s.id, s]));

  const byClass: DayByClass[] = classes.map((cls) => {
    const rec = recordsByClass.get(cls.id) || { present: 0, absentStudentIds: [] };
    const absentCount = rec.absentStudentIds.length;
    const absentees: DayAbsentee[] = options.includeAbsentees !== false
      ? rec.absentStudentIds.slice(0, options.capAbsentees).map((sid) => {
          const s = studentById.get(sid);
          return {
            studentId: sid,
            studentName: s?.name || "Unknown",
            gender: s?.gender || null,
            admissionNo: s?.admissionNo || "",
            teacherName: "",
            parentName: s?.parentName || "",
            parentPhone: s?.parentPhone || "",
            parentEmail: s?.parentEmail || "",
          };
        })
      : [];
    return {
      classId: cls.id,
      className: cls.name,
      total: totalByClass.get(cls.id) || 0,
      present: isHoliday ? 0 : rec.present,
      absent: isHoliday ? 0 : absentCount,
      note: noteByClass.get(cls.id) || null,
      absentees: isHoliday ? [] : absentees,
    };
  });

  const totalStudents = classes.reduce((sum, c) => sum + (totalByClass.get(c.id) || 0), 0);
  const present = byClass.reduce((s, c) => s + c.present, 0);
  const absent = byClass.reduce((s, c) => s + c.absent, 0);
  const percentage = isHoliday || totalStudents === 0 ? 0 : round2((present / totalStudents) * 100);
  const classesMarked = recordsByClass.size;

  return {
    date: dateStr,
    dayOfWeek,
    isHoliday,
    isWeekend: isWeekend(day),
    totalStudents,
    present,
    absent,
    percentage,
    totalClasses: classes.length,
    classesMarked,
    byClass,
  };
};
