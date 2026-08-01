import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDay } from "../../utils/attendanceAvailability";

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

    const classification = await classifySchoolDay(req.user.schoolId, attendanceDate);
    if (!classification.available) {
      return res.json({
        records: [],
        total: 0,
        page,
        totalPages: 0,
        reason: classification,
      });
    }

    const where = {
      classId: classId as string,
      date: attendanceDate,
    };

    const [records, total, dayNote] = await Promise.all([
      prisma.attendance.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          classId: true,
          date: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { name: true, admissionNo: true } },
        },
        orderBy: { student: { name: "asc" } },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
      prisma.attendanceNote.findUnique({
        where: { classId_date: { classId: classId as string, date: attendanceDate } },
        select: { note: true, updatedAt: true },
      }),
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
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      note: dayNote ? dayNote.note : null,
      noteUpdatedAt: dayNote ? dayNote.updatedAt : null,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      reason: classification,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
