import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession, normalizeTerm } from "../../utils/academicTerm";
import { getSchemeInfo } from "../../utils/scoreScheme";

export const studentAcademics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session } = req.query;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    const resolvedSession = await resolveSession(req.user.schoolId, term as string, session as string | undefined);

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: { id: true, classId: true, class: { select: { schoolType: true } } },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const schoolType = student.class?.schoolType ?? "";
    const scheme = schoolType
      ? await getSchemeInfo(req.user.schoolId, term as string, session as string | undefined, schoolType)
      : null;
    const expectedComponentIds = new Set(scheme?.components.map((c) => c.id) ?? []);

    const [examScores, totalStudents, attendanceRecords, academicTerm] = await Promise.all([
      prisma.examScore.findMany({
        where: {
          studentId: req.params.id,
          exam: { schoolId: req.user.schoolId, term: term as string, session: resolvedSession },
        },
        include: {
          exam: {
            include: { subject: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.student.count({
        where: { schoolId: req.user.schoolId, classId: student.classId, status: "ACTIVE" },
      }),
      prisma.attendance.findMany({
        where: { studentId: req.params.id },
        select: { status: true, date: true },
      }),
      prisma.academicTerm.findFirst({
        where: { schoolId: req.user.schoolId, term: normalizeTerm(term as string) || (term as string) },
        select: { startDate: true, endDate: true },
      }),
    ]);

    const subjectsMap = new Map<string, { subjectId: string; subjectName: string; scores: { type: string; score: number; maxScore: number; componentId?: string }[]; caTotal: number; examScore: number; total: number; grade: string; teacherName: string }>();

    const scoredBySubject = new Map<string, Set<string>>();
    for (const es of examScores) {
      const componentId = es.exam.componentId;
      if (!componentId) continue;
      let set = scoredBySubject.get(es.exam.subject.id);
      if (!set) {
        set = new Set();
        scoredBySubject.set(es.exam.subject.id, set);
      }
      set.add(componentId);
    }

    for (const es of examScores) {
      const subjectId = es.exam.subject.id;
      const subjectName = es.exam.subject.name;
      const entry = subjectsMap.get(subjectId) || {
        subjectId,
        subjectName,
        scores: [] as { type: string; score: number; maxScore: number; componentId?: string }[],
        caTotal: 0,
        examScore: 0,
        total: 0,
        grade: "F",
        teacherName: "",
      };

      const maxScore = es.exam.maxScore;
      const isExam = es.exam.type === "EXAM";
      entry.scores.push({
        type: es.exam.type,
        score: es.score,
        maxScore,
        componentId: es.exam.componentId ?? undefined,
      });
      if (isExam) {
        entry.examScore = es.score;
      } else {
        entry.caTotal += es.score;
      }
      entry.total = entry.caTotal + entry.examScore;

      const scored = scoredBySubject.get(subjectId);
      const complete =
        expectedComponentIds.size === 0 ||
        (scored !== undefined && [...expectedComponentIds].every((id) => scored.has(id)));
      entry.grade = complete ? getGrade(entry.total) : "";
      subjectsMap.set(subjectId, entry);
    }

    const subjects = Array.from(subjectsMap.values());

    const configComponents = (scheme?.components ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      maxScore: c.maxScore,
      sortOrder: c.sortOrder,
    }));
    const componentOrder = new Map(configComponents.map((c) => [c.id, c.sortOrder]));
    for (const subject of subjects) {
      subject.scores.sort(
        (a, b) =>
          (a.componentId !== undefined ? componentOrder.get(a.componentId) ?? 999 : 999) -
          (b.componentId !== undefined ? componentOrder.get(b.componentId) ?? 999 : 999),
      );
    }

    const totalScores = subjects.reduce((sum, s) => sum + s.total, 0);
    const average = subjects.length > 0 ? Math.round((totalScores / subjects.length) * 10) / 10 : 0;

    let bestSubject = null;
    let worstSubject = null;
    if (subjects.length > 0) {
      const sorted = [...subjects].sort((a, b) => b.total - a.total);
      bestSubject = { name: sorted[0].subjectName, score: sorted[0].total };
      worstSubject = { name: sorted[sorted.length - 1].subjectName, score: sorted[sorted.length - 1].total };
    }

    const termStart = academicTerm?.startDate ? new Date(academicTerm.startDate) : null;
    const termEnd = academicTerm?.endDate ? new Date(academicTerm.endDate) : null;

    let expectedSchoolDays = 0;
    if (termStart && termEnd) {
      const holidayRecords = await prisma.holiday.findMany({
        where: { schoolId: req.user.schoolId, date: { gte: termStart, lte: termEnd } },
        select: { date: true },
      });
      const termHolidayDates = new Set(holidayRecords.map((h) => h.date.toISOString().split("T")[0]));
      const cursor = new Date(termStart);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(termEnd);
      end.setHours(23, 59, 59, 999);
      // Only count school days up to today — future days of an ongoing term
      // must not deflate the attendance percentage.
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (end > now) end.setTime(now.getTime());
      while (cursor <= end) {
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        if (!isWeekend && !termHolidayDates.has(cursor.toISOString().split("T")[0])) {
          expectedSchoolDays++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const termAttendance =
      termStart && termEnd
        ? attendanceRecords.filter((a) => a.date >= termStart && a.date <= termEnd)
        : attendanceRecords;

    let attendancePercentage = 0;
    if (termAttendance.length > 0) {
      const present = termAttendance.filter((a) => a.status === "present").length;
      const denominator = expectedSchoolDays > 0 ? expectedSchoolDays : termAttendance.length;
      attendancePercentage = Math.round((present / denominator) * 1000) / 10;
    }

    let position = 0;
    if (subjects.length > 0 && totalStudents > 1) {
      const allStudentScores = await prisma.examScore.groupBy({
        by: ["studentId"],
        where: {
          exam: { schoolId: req.user.schoolId, term: term as string, session: resolvedSession },
          student: { classId: student.classId },
        },
        _sum: { score: true },
      });
      const classTotalScores = allStudentScores.map((s) => s._sum.score || 0).sort((a, b) => b - a);
      const studentTotal = subjects.reduce((sum, s) => sum + s.total, 0);
      position = classTotalScores.indexOf(studentTotal) + 1;
      if (position === 0) position = classTotalScores.length;
    }

    res.json({
      studentId: req.params.id,
      term: term as string,
      session: resolvedSession,
      average,
      bestSubject,
      worstSubject,
      attendancePercentage,
      subjects,
      components: configComponents,
      position,
      classSize: totalStudents,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Academics");
    res.status(errorResponse.status).json(errorResponse);
  }
};

function getGrade(total: number): string {
  if (total >= 75) return "A";
  if (total >= 65) return "B";
  if (total >= 55) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}
