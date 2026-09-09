import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const getSchoolStats = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [schools, total, userCounts, studentCounts] = await Promise.all([
      prisma.school.findMany({
        select: {
          id: true,
          name: true,
          schoolCode: true,
          state: true,
          schoolType: true,
          active: true,
          approvalStatus: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.school.count(),
      prisma.user.groupBy({ by: ["schoolId"], _count: { _all: true } }),
      prisma.student.groupBy({ by: ["schoolId"], _count: { _all: true } }),
    ]);

    const usersBySchool = new Map<string, number>();
    for (const row of userCounts) {
      if (row.schoolId) usersBySchool.set(row.schoolId, row._count._all ?? 0);
    }
    const studentsBySchool = new Map<string, number>();
    for (const row of studentCounts) {
      if (row.schoolId) studentsBySchool.set(row.schoolId, row._count._all ?? 0);
    }

    res.json({
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        schoolCode: s.schoolCode,
        state: s.state,
        schoolType: JSON.parse(s.schoolType),
        active: s.active,
        approvalStatus: s.approvalStatus,
        users: usersBySchool.get(s.id) ?? 0,
        students: studentsBySchool.get(s.id) ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin School Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
