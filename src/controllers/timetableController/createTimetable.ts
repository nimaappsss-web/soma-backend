import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, subjectId, teacherId, day, period, startTime, endTime, room } = req.body;

    if (!classId || !subjectId || !teacherId || !day || period === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: "classId, subjectId, teacherId, day, period, startTime, and endTime are required" });
    }

    const existing = await prisma.timetableEntry.findFirst({
      where: { schoolId: req.user.schoolId, classId, day, period },
    });

    if (existing) {
      return res.status(400).json({ error: "A timetable entry already exists for this class, day, and period" });
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        classId,
        subjectId,
        teacherId,
        day,
        period,
        startTime,
        endTime,
        room: room || null,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      timetable: {
        id: entry.id,
        classId: entry.class.id,
        className: entry.class.name,
        subjectId: entry.subject.id,
        subjectName: entry.subject.name,
        teacherId: entry.teacher.id,
        teacherName: entry.teacher.name,
        day: entry.day,
        period: entry.period,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
