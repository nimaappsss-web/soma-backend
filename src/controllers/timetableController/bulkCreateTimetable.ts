import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const bulkCreateTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, entries } = req.body;

    if (!classId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "classId and entries array are required" });
    }

    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
    });

    if (!classExists) {
      return res.status(404).json({ error: "Class not found" });
    }

    const created = [];
    for (const entry of entries) {
      const { id, subjectId, teacherId, day, period, startTime, endTime, room } = entry;

      if (!subjectId || !teacherId || !day || period === undefined || !startTime || !endTime) {
        continue;
      }

      await prisma.timetableEntry.deleteMany({
        where: { schoolId: req.user.schoolId, classId, day, period },
      });

      const createdEntry = await prisma.timetableEntry.create({
        data: {
          id: id || undefined,
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

      created.push({
        id: createdEntry.id,
        classId: createdEntry.class.id,
        className: createdEntry.class.name,
        subjectId: createdEntry.subject.id,
        subjectName: createdEntry.subject.name,
        teacherId: createdEntry.teacher.id,
        teacherName: createdEntry.teacher.name,
        day: createdEntry.day,
        period: createdEntry.period,
        startTime: createdEntry.startTime,
        endTime: createdEntry.endTime,
        room: createdEntry.room,
      });
    }

    res.status(201).json({ entries: created });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Create Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
