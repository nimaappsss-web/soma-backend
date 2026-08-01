import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDays, toUtcDateString } from "../../utils/attendanceAvailability";
import { round2 } from "../../utils/dayAttendance";

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

    const [attendance, totalStudents] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          student: { schoolId, status: "ACTIVE" },
          ...(classId ? { classId: classId as string } : {}),
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
      }),
      prisma.student.count({
        where: { schoolId, status: "ACTIVE", ...(classId ? { classId: classId as string } : {}) },
      }),
    ]);

    const totalDaysInMonth = endDate.getDate();
    const dates: Date[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      dates.push(new Date(Date.UTC(parseInt(year as string), parseInt(month as string) - 1, d)));
    }

    const classifications = await classifySchoolDays(schoolId, dates);

    const dayAttendance = new Map<string, { present: number; absent: number; late: number; recorded: number }>();
    for (const a of attendance) {
      const key = toUtcDateString(a.date);
      const entry = dayAttendance.get(key) || { present: 0, absent: 0, late: 0, recorded: 0 };
      entry.recorded += 1;
      if (a.status === "present") entry.present += 1;
      else if (a.status === "absent") entry.absent += 1;
      else if (a.status === "late") entry.late += 1;
      dayAttendance.set(key, entry);
    }

    const days: any[] = [];
    let schoolDays = 0;

    for (const date of dates) {
      const dateStr = toUtcDateString(date);
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      const classification = classifications.get(dateStr) || { available: true };
      const counts = dayAttendance.get(dateStr) || { present: 0, absent: 0, late: 0, recorded: 0 };

      if (classification.available) {
        schoolDays++;
      }

      const percentage = totalStudents > 0 ? round2((counts.present / totalStudents) * 100) : 0;

      days.push({
        date: dateStr,
        dayOfWeek,
        isSchoolDay: classification.available,
        isHoliday: classification.type === "HOLIDAY",
        isWeekend: classification.type === "WEEKEND",
        isOutOfTerm: classification.type === "OUT_OF_TERM",
        blockedReason: classification.message || null,
        blockedType: classification.type || null,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        unmarked: totalStudents - counts.recorded,
        percentage,
      });
    }

    res.json({
      month: parseInt(month as string),
      year: parseInt(year as string),
      schoolDays,
      days,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Calendar");
    res.status(errorResponse.status).json(errorResponse);
  }
};
