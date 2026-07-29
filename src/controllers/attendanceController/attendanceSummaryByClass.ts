import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceSummaryByClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId } = req.params;
    const { from, to } = req.query;

    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
    });

    if (!classExists) {
      return res.status(404).json({ error: "Class not found" });
    }

    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(1));
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to as string) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const [totalStudents, attendanceRecords, holidays] = await Promise.all([
      prisma.student.count({
        where: { schoolId: req.user.schoolId, classId, status: "ACTIVE" },
      }),
      prisma.attendance.findMany({
        where: {
          student: { schoolId: req.user.schoolId },
          classId,
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
      }),
      prisma.holiday.findMany({
        where: { schoolId: req.user.schoolId, date: { gte: startDate, lte: endDate } },
        select: { date: true },
      }),
    ]);

    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    const dailyStats: Record<string, { present: number; absent: number; total: number }> = {};
    for (const record of attendanceRecords) {
      const dateStr = record.date.toISOString().split("T")[0];
      if (!dailyStats[dateStr]) dailyStats[dateStr] = { present: 0, absent: 0, total: totalStudents };
      if (record.status === "present") dailyStats[dateStr].present++;
      else if (record.status === "absent") dailyStats[dateStr].absent++;
    }

    const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
    const absentCount = attendanceRecords.filter((a) => a.status === "absent").length;

    const schoolDays = [...Array(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))).keys()]
      .map((i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
      })
      .filter((d) => d.getDay() !== 0 && d.getDay() !== 6 && !holidayDates.has(d.toISOString().split("T")[0])).length;

    const percentage = schoolDays > 0 && totalStudents > 0
      ? Math.round((presentCount / (schoolDays * totalStudents)) * 100)
      : 0;

    res.json({
      classId,
      className: classExists.name,
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
      totalStudents,
      present: presentCount,
      absent: absentCount,
      percentage,
      schoolDays,
      dailyStats,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Summary By Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
