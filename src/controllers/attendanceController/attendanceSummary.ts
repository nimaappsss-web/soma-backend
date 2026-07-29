import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schoolId = req.user.schoolId;

    const isHoliday = await prisma.holiday.findFirst({
      where: { schoolId, date: targetDate },
    });

    const [totalStudents, attendanceByClass] = await Promise.all([
      prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
      prisma.attendance.groupBy({
        by: ["classId"],
        where: {
          student: { schoolId },
          date: { gte: targetDate, lt: tomorrow },
        },
        _count: { status: true },
      }),
    ]);

    const classIds = attendanceByClass.map((a) => a.classId);
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    const allClasses = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });

    const byClass = await Promise.all(
      allClasses.map(async (cls) => {
        const classStudents = await prisma.student.count({
          where: { schoolId, classId: cls.id, status: "ACTIVE" },
        });
        const classAttendance = await prisma.attendance.groupBy({
          by: ["status"],
          where: {
            student: { schoolId },
            classId: cls.id,
            date: { gte: targetDate, lt: tomorrow },
          },
          _count: { status: true },
        });
        const present = classAttendance.find((a) => a.status === "present")?._count.status || 0;
        const absent = classAttendance.find((a) => a.status === "absent")?._count.status || 0;

        return {
          classId: cls.id,
          className: cls.name,
          total: classStudents,
          present,
          absent,
        };
      })
    );

    const totalPresent = byClass.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = totalStudents - totalPresent;
    const percentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    res.json({
      date: targetDate.toISOString().split("T")[0],
      isHoliday: !!isHoliday,
      totalStudents,
      present: totalPresent,
      absent: totalAbsent,
      percentage,
      byClass,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Summary");
    res.status(errorResponse.status).json(errorResponse);
  }
};
