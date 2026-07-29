import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceSummaryByTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { teacherId } = req.params;
    const { from, to } = req.query;

    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId: req.user.schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const startDate = from ? new Date(from as string) : new Date(new Date().setDate(1));
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to as string) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const teacherClasses = await prisma.teacherAssignmentClass.findMany({
      where: { assignment: { teacherId, schoolId: req.user.schoolId } },
      select: { classId: true },
    });

    const classIds = teacherClasses.map((tc) => tc.classId);

    const [attendanceRecords, holidays] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          classId: { in: classIds },
          date: { gte: startDate, lte: endDate },
        },
        select: { status: true, date: true },
      }),
      prisma.holiday.findMany({
        where: { schoolId: req.user.schoolId, date: { gte: startDate, lte: endDate } },
        select: { date: true },
      }),
    ]);

    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
    const absentCount = attendanceRecords.filter((a) => a.status === "absent").length;
    const totalMarked = attendanceRecords.length;

    let schoolDays = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);
    while (cursor <= rangeEnd) {
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      if (!isWeekend && !holidayDates.has(cursor.toISOString().split("T")[0])) {
        schoolDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const denominator = schoolDays > 0 ? schoolDays : totalMarked;
    const percentage = denominator > 0 ? Math.round((presentCount / denominator) * 100) : 0;

    res.json({
      teacherId,
      teacherName: teacher.name,
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
      totalMarked,
      schoolDays,
      present: presentCount,
      absent: absentCount,
      percentage,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Summary By Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
