import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({ error: "classId and date are required" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const attendanceDate = new Date(date as string);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const where = {
      classId: classId as string,
      date: attendanceDate,
    };

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          classId: true,
          date: true,
          status: true,
          remarks: true,
          createdAt: true,
          updatedAt: true,
          syncStatus: true,
          syncedAt: true,
          version: true,
          student: { select: { name: true, admissionNo: true } },
        },
        orderBy: { student: { name: "asc" } },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        classId: r.classId,
        date: r.date,
        studentName: r.student.name,
        admissionNo: r.student.admissionNo,
        status: r.status,
        remarks: r.remarks,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        syncStatus: r.syncStatus,
        syncedAt: r.syncedAt,
        version: r.version,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
