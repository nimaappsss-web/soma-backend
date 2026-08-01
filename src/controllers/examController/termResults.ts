import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession, normalizeTerm } from "../../utils/academicTerm";

export const termResults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session } = req.query;

    if (!classId || !term) {
      return res.status(400).json({ error: "classId and term are required" });
    }

    const schoolId = req.user.schoolId;
    const resolvedSession = await resolveSession(schoolId, term as string, session as string | undefined);

    const classInfo = await prisma.class.findFirst({
      where: { id: classId as string, schoolId },
    });

    if (!classInfo) {
      return res.status(404).json({ error: "Class not found" });
    }

    const role = req.user.role;
    const isAdmin = role === "PRINCIPAL" || role === "SCHOOL_ADMIN";

    if (!isAdmin) {
      const teacher = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { formClassId: true },
      });
      if (!teacher?.formClassId || teacher.formClassId !== classId) {
        return res.status(403).json({
          error: "Teachers can only view results for their own form class",
        });
      }
    }

    const students = await prisma.student.findMany({
      where: { schoolId, classId: classId as string, status: "ACTIVE" },
      select: { id: true, name: true, admissionNo: true },
    });

    const subjects = await prisma.examSession.findMany({
      where: { schoolId, term: term as string, session: resolvedSession },
      include: { subject: { select: { id: true, name: true } } },
    });

    const subjectSet = new Map<string, string>();
    for (const s of subjects) {
      subjectSet.set(s.subjectId, s.subject.name);
    }

    const examSessions = await prisma.examSession.findMany({
      where: { schoolId, term: term as string, session: resolvedSession },
      select: { id: true, subjectId: true, type: true },
    });

    const examIds = examSessions.map((e) => e.id);
    const examSubjectMap = new Map(examSessions.map((e) => [e.id, e]));

    const allScores = examIds.length > 0
      ? await prisma.examScore.findMany({
          where: { examId: { in: examIds }, student: { classId: classId as string, schoolId } },
          select: { studentId: true, examId: true, score: true },
        })
      : [];

    const scoresByStudent = new Map<string, Map<string, { caTotal: number; examScore: number; total: number }>>();
    for (const score of allScores) {
      const exam = examSubjectMap.get(score.examId);
      if (!exam) continue;

      if (!scoresByStudent.has(score.studentId)) {
        scoresByStudent.set(score.studentId, new Map());
      }
      const studentSubjects = scoresByStudent.get(score.studentId)!;
      if (!studentSubjects.has(exam.subjectId)) {
        studentSubjects.set(exam.subjectId, { caTotal: 0, examScore: 0, total: 0 });
      }
      const subj = studentSubjects.get(exam.subjectId)!;
      if (exam.type === "EXAM") {
        subj.examScore = score.score;
      } else {
        subj.caTotal += score.score;
      }
      subj.total = subj.caTotal + subj.examScore;
    }

    const academicTerm = await prisma.academicTerm.findFirst({
      where: { schoolId, term: normalizeTerm(term as string) || (term as string) },
      select: { startDate: true, endDate: true },
    });

    const termStart = academicTerm?.startDate ? new Date(academicTerm.startDate) : null;
    const termEnd = academicTerm?.endDate ? new Date(academicTerm.endDate) : null;

    const holidayRecords = termStart && termEnd ? await prisma.holiday.findMany({
      where: { schoolId, date: { gte: termStart, lte: termEnd } },
      select: { date: true },
    }) : [];

    const holidayDates = new Set(holidayRecords.map((h) => h.date.toISOString().split("T")[0]));

    let expectedSchoolDays = 0;
    if (termStart && termEnd) {
      const cursor = new Date(termStart);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(termEnd);
      end.setHours(23, 59, 59, 999);
      while (cursor <= end) {
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        if (!isWeekend && !holidayDates.has(cursor.toISOString().split("T")[0])) {
          expectedSchoolDays++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const attendanceWhere: any = { classId: classId as string, student: { schoolId } };
    if (termStart && termEnd) {
      attendanceWhere.date = { gte: termStart, lte: termEnd };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: { studentId: true, status: true },
    });

    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    for (const record of attendanceRecords) {
      if (!attendanceByStudent.has(record.studentId)) {
        attendanceByStudent.set(record.studentId, { present: 0, total: 0 });
      }
      const stats = attendanceByStudent.get(record.studentId)!;
      stats.total++;
      if (record.status === "present") stats.present++;
    }

    const studentResults = students.map((student) => {
      const studentSubjects = scoresByStudent.get(student.id) || new Map();
      const subjectResults = Array.from(subjectSet.entries()).map(([subjectId, subjectName]) => {
        const subj = studentSubjects.get(subjectId);
        const caScore = subj?.caTotal || 0;
        const examScore = subj?.examScore || 0;
        const total = subj?.total || 0;
        return {
          subjectId,
          subjectName,
          caScore,
          examScore,
          total,
          grade: getGrade(total),
          teacherName: "",
        };
      });

      const totalScore = subjectResults.reduce((sum, s) => sum + s.total, 0);
      const average = subjectResults.length > 0 ? Math.round((totalScore / subjectResults.length) * 10) / 10 : 0;

      const att = attendanceByStudent.get(student.id);
      const denominator = expectedSchoolDays > 0 ? expectedSchoolDays : (att?.total || 0);
      const attendancePercentage = att && denominator > 0 ? Math.round((att.present / denominator) * 1000) / 10 : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        admissionNo: student.admissionNo,
        subjects: subjectResults,
        totalScore,
        average,
        position: 0,
        classSize: students.length,
        attendancePercentage,
      };
    });

    const sorted = [...studentResults].sort((a, b) => b.average - a.average);
    sorted.forEach((s, i) => {
      s.position = i + 1;
    });

    res.json({
      classId: classId as string,
      className: classInfo.name,
      term: term as string,
      session: resolvedSession,
      students: sorted,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Term Results");
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
