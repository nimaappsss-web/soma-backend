import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listSchools = async (req: AuthRequest, res: Response) => {
  try {
    const { search, state, active, schoolType, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ...(state ? { state: state as string } : {}),
      ...(schoolType ? { schoolType: { contains: schoolType as string } } : {}),
      ...(active !== undefined
        ? { active: active === "true" || active === "1" }
        : {}),
      ...(status
        ? { approvalStatus: String(status).toUpperCase() }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: "insensitive" } },
              { schoolCode: { contains: search as string, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [schools, total, studentCounts] = await Promise.all([
      prisma.school.findMany({
        where,
        select: {
          id: true,
          name: true,
          schoolCode: true,
          state: true,
          schoolType: true,
          active: true,
          approvalStatus: true,
          rejectionReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.school.count({ where }),
      prisma.student.groupBy({ by: ["schoolId"], _count: { _all: true } }),
    ]);

    const studentMap = new Map<string, number>();
    for (const row of studentCounts) {
      if (row.schoolId) studentMap.set(row.schoolId, row._count._all ?? 0);
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
        rejectionReason: s.rejectionReason,
        registeredAt: s.createdAt.toISOString(),
        students: studentMap.get(s.id) ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Schools");
    res.status(errorResponse.status).json(errorResponse);
  }
};
