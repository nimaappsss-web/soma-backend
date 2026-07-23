import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { from, to } = req.query;

    const student = await prisma.student.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where: any = { studentId: id };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) {
        const end = new Date(to as string);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        select: {
          id: true,
          date: true,
          status: true,
          classId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({
      records: records.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        classId: r.classId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
