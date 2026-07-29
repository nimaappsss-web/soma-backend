import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentMonthlyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: { id: true, classId: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    const [attendance, holidays] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId: req.params.id,
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
        orderBy: { date: "asc" },
      }),
      prisma.holiday.findMany({
        where: {
          schoolId: req.user.schoolId,
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true },
      }),
    ]);

    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    const totalDaysInMonth = endDate.getDate();
    let schoolDays = 0;

    const days: { date: string; status: string; isWeekend?: boolean }[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(parseInt(year as string), parseInt(month as string) - 1, d);
      const dateStr = date.toISOString().split("T")[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if (isWeekend) {
        days.push({ date: dateStr, status: "weekend", isWeekend: true });
        continue;
      }

      if (holidayDates.has(dateStr)) {
        days.push({ date: dateStr, status: "holiday" });
        continue;
      }

      schoolDays++;
      const record = attendance.find((a) => a.date.toISOString().split("T")[0] === dateStr);
      days.push({ date: dateStr, status: record ? record.status : "absent" });
    }

    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const percentage = schoolDays > 0 ? Math.round((present / schoolDays) * 100) : 0;

    res.json({
      studentId: req.params.id,
      month: parseInt(month as string),
      year: parseInt(year as string),
      schoolDays,
      present,
      absent,
      percentage,
      days,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Monthly Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
