import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { search, status, department } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId: req.user.schoolId };
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    res.json({ staff, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
