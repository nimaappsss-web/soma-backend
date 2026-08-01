import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getDayAttendanceSummary } from "../../utils/dayAttendance";

const ABSENTEE_CAP = 20;

export const attendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date, classId } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const summary = await getDayAttendanceSummary(req.user.schoolId, targetDate, {
      classId: classId as string | undefined,
      capAbsentees: ABSENTEE_CAP,
    });

    res.json({
      date: summary.date,
      dayOfWeek: summary.dayOfWeek,
      isHoliday: summary.isHoliday,
      isWeekend: summary.isWeekend,
      totalStudents: summary.totalStudents,
      present: summary.present,
      absent: summary.absent,
      percentage: summary.percentage,
      totalClasses: summary.totalClasses,
      classesMarked: summary.classesMarked,
      byClass: summary.byClass.map((c) => ({
        classId: c.classId,
        className: c.className,
        total: c.total,
        present: c.present,
        absent: c.absent,
      })),
      absentees: summary.byClass
        .flatMap((c) => c.absentees)
        .slice(0, ABSENTEE_CAP)
        .map((a) => ({
          studentId: a.studentId,
          studentName: a.studentName,
          admissionNo: a.admissionNo,
          parentName: a.parentName,
        })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Summary");
    res.status(errorResponse.status).json(errorResponse);
  }
};
