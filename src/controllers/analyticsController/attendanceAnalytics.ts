import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getDayAttendanceSummary } from "../../utils/dayAttendance";

export const attendanceAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date, classId } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const summary = await getDayAttendanceSummary(req.user.schoolId, targetDate, {
      classId: classId as string | undefined,
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
        note: c.note,
        absentees: c.absentees,
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Analytics");
    res.status(errorResponse.status).json(errorResponse);
  }
};
