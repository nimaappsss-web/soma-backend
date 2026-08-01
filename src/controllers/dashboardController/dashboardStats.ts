import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getDayAttendanceSummary } from "../../utils/dayAttendance";

export const dashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const today = new Date();

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
      todaySummary,
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
      getDayAttendanceSummary(schoolId, today),
    ]);

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
        today: {
          present: todaySummary.present,
          absent: todaySummary.absent,
          percentage: todaySummary.percentage,
          dayOfWeek: todaySummary.dayOfWeek,
        },
        isHoliday: todaySummary.isHoliday,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Dashboard Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
