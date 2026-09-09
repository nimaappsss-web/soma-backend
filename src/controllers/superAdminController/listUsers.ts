import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, schoolId, status, schoolName } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ...(role ? { role: (role as string).toUpperCase() } : {}),
      ...(schoolId ? { schoolId: schoolId as string } : {}),
      ...(status ? { active: status === "true" || status === "1" } : {}),
      ...(schoolName
        ? { school: { name: { contains: schoolName as string, mode: "insensitive" } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: "insensitive" } },
              { email: { contains: search as string, mode: "insensitive" } },
              { phone: { contains: search as string, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total, roleBreakdown] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      roleBreakdown,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin List Users");
    res.status(errorResponse.status).json(errorResponse);
  }
};
