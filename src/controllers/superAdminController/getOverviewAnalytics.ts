import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const getOverviewAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalSchools,
      activeSchools,
      totalStudents,
      activeStudents,
      totalClasses,
      totalSubjects,
      totalUsers,
      roleBreakdown,
      newSchools30d,
      newUsers30d,
      revenueCollected,
    ] = await Promise.all([
      prisma.school.count({}),
      prisma.school.count({ where: { active: true } }),
      prisma.student.count({}),
      prisma.student.count({ where: { status: "active" } }),
      prisma.class.count({}),
      prisma.subject.count({}),
      prisma.user.count({}),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.school.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.payment.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true },
      }),
    ]);

    const countsByRole = (role: string) =>
      roleBreakdown.find((r) => r.role === role)?._count._all ?? 0;

    res.json({
      totals: {
        schools: totalSchools,
        activeSchools,
        students: totalStudents,
        activeStudents,
        classes: totalClasses,
        subjects: totalSubjects,
        users: totalUsers,
        principals: countsByRole("PRINCIPAL") + countsByRole("SCHOOL_ADMIN"),
        teachers: countsByRole("TEACHER"),
        parents: countsByRole("PARENT"),
        bursars: countsByRole("BURSAR"),
        staff: countsByRole("STAFF"),
        superAdmins: countsByRole("SUPER_ADMIN"),
      },
      growth: {
        newSchools30d: newSchools30d,
        newUsers30d: newUsers30d,
      },
      revenue: {
        collected: revenueCollected._sum.amount ?? 0,
      },
      roleBreakdown,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Overview Analytics");
    res.status(errorResponse.status).json(errorResponse);
  }
};