import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listStudents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, status, gender, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: req.user.schoolId,
      ...(classId ? { classId: classId as string } : {}),
      ...(status ? { status: status as string } : {}),
      ...(gender ? { gender: (gender as string).toUpperCase() } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { admissionNo: { contains: search as string, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          name: true,
          admissionNo: true,
          classId: true,
          gender: true,
          dateOfBirth: true,
          address: true,
          imageUrl: true,
          status: true,
          parentName: true,
          parentPhone: true,
          parentEmail: true,
          createdAt: true,
          updatedAt: true,
          syncStatus: true,
          syncedAt: true,
          version: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Students");
    res.status(errorResponse.status).json(errorResponse);
  }
};
