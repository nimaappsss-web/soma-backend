import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const dashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayHoliday = await prisma.holiday.findFirst({
      where: { schoolId, date: today },
    });

    const [
      totalStudents,
      activeStudents,
      maleStudents,
      femaleStudents,
      totalTeachers,
      activeTeachers,
      pendingTeacherInvites,
      totalClasses,
      totalParents,
      activeParents,
      pendingParentInvites,
      totalSubjects,
      todayAttendance,
      totalStudentsForAttendance,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
      prisma.student.count({ where: { schoolId, status: "ACTIVE", gender: "M" } }),
      prisma.student.count({ where: { schoolId, status: "ACTIVE", gender: "F" } }),
      prisma.user.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] } } }),
      prisma.user.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] }, active: true } }),
      prisma.inviteToken.count({ where: { schoolId, role: { in: ["TEACHER", "BURSAR"] }, usedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.user.count({ where: { schoolId, role: "PARENT" } }),
      prisma.user.count({ where: { schoolId, role: "PARENT", emailVerified: true } }),
      prisma.inviteToken.count({ where: { schoolId, role: "PARENT", usedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          student: { schoolId },
          date: { gte: today, lt: tomorrow },
        },
        _count: { status: true },
      }),
      prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
    ]);

    const presentCount = todayAttendance.find((a) => a.status === "present")?._count.status || 0;
    const absentCount = todayAttendance.find((a) => a.status === "absent")?._count.status || 0;
    const attendancePercentage = totalStudentsForAttendance > 0
      ? Math.round((presentCount / totalStudentsForAttendance) * 100)
      : 0;

    res.json({
      students: {
        total: totalStudents,
        active: activeStudents,
        male: maleStudents,
        female: femaleStudents,
      },
      teachers: {
        total: totalTeachers,
        active: activeTeachers,
        pendingInvites: pendingTeacherInvites,
      },
      classes: { total: totalClasses },
      parents: {
        total: totalParents,
        active: activeParents,
        pending: pendingParentInvites,
      },
      subjects: { total: totalSubjects },
      attendance: {
        today: todayHoliday ? null : {
          present: presentCount,
          absent: absentCount,
          percentage: attendancePercentage,
          dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
        },
        isHoliday: !!todayHoliday,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Dashboard Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
