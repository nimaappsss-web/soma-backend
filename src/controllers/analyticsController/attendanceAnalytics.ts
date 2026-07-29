import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceAnalytics = async (req: AuthRequest, res: Response) => {
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

    const totalStudents = await prisma.student.count({
      where: { schoolId, status: "ACTIVE" },
    });

    const allClasses = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });

    const dayOfWeek = targetDate.toLocaleDateString("en-US", { weekday: "long" });

    if (isHoliday) {
      return res.json({
        date: targetDate.toISOString().split("T")[0],
        dayOfWeek,
        isHoliday: true,
        totalStudents,
        present: 0,
        absent: 0,
        percentage: 0,
        byClass: [],
      });
    }

    const byClass = await Promise.all(
      allClasses.map(async (cls) => {
        const classStudents = await prisma.student.count({
          where: { schoolId, classId: cls.id, status: "ACTIVE" },
        });

        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            student: { schoolId, status: "ACTIVE" },
            classId: cls.id,
            date: { gte: targetDate, lt: tomorrow },
          },
          select: { status: true, studentId: true },
        });

        const present = attendanceRecords.filter((a) => a.status === "present").length;
        const absent = attendanceRecords.filter((a) => a.status === "absent").length;

        const absentStudentIds = attendanceRecords
          .filter((a) => a.status === "absent")
          .map((a) => a.studentId);

        const absentees = absentStudentIds.length > 0
          ? await prisma.student.findMany({
              where: { id: { in: absentStudentIds }, schoolId },
              select: {
                id: true,
                name: true,
                gender: true,
                admissionNo: true,
                parentName: true,
                parentPhone: true,
                parentEmail: true,
              },
            })
          : [];

        return {
          classId: cls.id,
          className: cls.name,
          total: classStudents,
          present,
          absent,
          absentees: absentees.map((s) => ({
            studentId: s.id,
            studentName: s.name,
            gender: s.gender,
            admissionNo: s.admissionNo,
            teacherName: "",
            parentName: s.parentName || "",
            parentPhone: s.parentPhone || "",
            parentEmail: s.parentEmail || "",
          })),
        };
      })
    );

    const totalPresent = byClass.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = byClass.reduce((sum, c) => sum + c.absent, 0);
    const percentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    res.json({
      date: targetDate.toISOString().split("T")[0],
      dayOfWeek,
      isHoliday: false,
      totalStudents,
      present: totalPresent,
      absent: totalAbsent,
      percentage,
      byClass,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Analytics");
    res.status(errorResponse.status).json(errorResponse);
  }
};
