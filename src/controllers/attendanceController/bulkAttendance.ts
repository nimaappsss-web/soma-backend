import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDay } from "../../utils/attendanceAvailability";

export const bulkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, date, records, note } = req.body;

    if (!classId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "classId, date, and records array are required" });
    }

    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const classification = await classifySchoolDay(req.user.schoolId, attendanceDate);
    if (!classification.available) {
      return res.status(400).json({
        error: "Attendance cannot be marked on this date",
        reason: classification,
      });
    }

    const studentIds = records.map((r: any) => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: req.user.schoolId, classId },
      select: { id: true },
    });

    const validIds = new Set(students.map((s) => s.id));

    if (note !== undefined && note !== null && String(note).trim() !== "") {
      await prisma.attendanceNote.upsert({
        where: { classId_date: { classId, date: attendanceDate } },
        update: { note: String(note).trim(), createdBy: req.user.userId },
        create: {
          schoolId: req.user.schoolId,
          classId,
          date: attendanceDate,
          note: String(note).trim(),
          createdBy: req.user.userId,
        },
      });
    }

    const results = [];

    for (const record of records) {
      if (!validIds.has(record.studentId)) continue;

      const upserted = await prisma.attendance.upsert({
        where: {
          studentId_classId_date: {
            studentId: record.studentId,
            classId,
            date: attendanceDate,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks || null,
          version: { increment: 1 },
        },
        create: {
          studentId: record.studentId,
          classId,
          date: attendanceDate,
          status: record.status,
          remarks: record.remarks || null,
          deviceId: req.body.deviceId || null,
        },
        select: {
          id: true,
          studentId: true,
          status: true,
        },
      });

      results.push(upserted);
    }

    res.json({ count: results.length, records: results });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
