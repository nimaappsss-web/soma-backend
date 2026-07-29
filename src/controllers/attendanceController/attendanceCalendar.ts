import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceCalendar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { month, year, classId } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const schoolId = req.user.schoolId;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    const [holidays, attendance] = await Promise.all([
      prisma.holiday.findMany({
        where: { schoolId, date: { gte: startDate, lte: endDate } },
        select: { date: true },
      }),
      prisma.attendance.findMany({
        where: {
          student: { schoolId, status: "ACTIVE" },
          ...(classId ? { classId: classId as string } : {}),
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
      }),
    ]);

    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    const totalStudents = await prisma.student.count({
      where: { schoolId, status: "ACTIVE", ...(classId ? { classId: classId as string } : {}) },
    });

    const totalDaysInMonth = endDate.getDate();
    const days: any[] = [];
    let schoolDays = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(parseInt(year as string), parseInt(month as string) - 1, d);
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if (isWeekend) {
        days.push({ date: dateStr, dayOfWeek, isSchoolDay: false, isHoliday: false, present: null, absent: null, percentage: null });
        continue;
      }

      if (holidayDates.has(dateStr)) {
        days.push({ date: dateStr, dayOfWeek, isSchoolDay: false, isHoliday: true, present: null, absent: null, percentage: null });
        continue;
      }

      schoolDays++;
      const dayAttendance = attendance.filter((a) => a.date.toISOString().split("T")[0] === dateStr);
      const present = dayAttendance.filter((a) => a.status === "present").length;
      const absent = totalStudents - present;
      const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

      days.push({ date: dateStr, dayOfWeek, isSchoolDay: true, isHoliday: false, present, absent, percentage });
    }

    res.json({
      month: parseInt(month as string),
      year: parseInt(year as string),
      schoolDays,
      holidayDates: Array.from(holidayDates),
      days,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Calendar");
    res.status(errorResponse.status).json(errorResponse);
  }
};
