import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

/**
 * Attendance for the parent's own children. Returns per-student records in the
 * requested window (defaults to today) so parents can see "present/absent today"
 * and recent history without exposing other students' data.
 */
export const parentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const studentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);
    if (studentIds.length === 0) {
      return res.json({ records: [], total: 0 });
    }

    const { from, to } = req.query;
    const where: any = { studentId: { in: studentIds } };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) {
        const end = new Date(to as string);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        classId: true,
        date: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    res.json({
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        classId: r.classId,
        date: r.date,
        status: r.status,
        updatedAt: r.updatedAt,
      })),
      total: records.length,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Parent Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
