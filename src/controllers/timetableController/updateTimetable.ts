import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { subjectId, teacherId, startTime, endTime, room } = req.body;

    const entry = await prisma.timetableEntry.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!entry) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    const updated = await prisma.timetableEntry.update({
      where: { id: req.params.id },
      data: {
        ...(subjectId !== undefined ? { subjectId } : {}),
        ...(teacherId !== undefined ? { teacherId } : {}),
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(room !== undefined ? { room } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    });

    res.json({
      timetable: {
        id: updated.id,
        classId: updated.class.id,
        className: updated.class.name,
        subjectId: updated.subject.id,
        subjectName: updated.subject.name,
        teacherId: updated.teacher.id,
        teacherName: updated.teacher.name,
        day: updated.day,
        period: updated.period,
        startTime: updated.startTime,
        endTime: updated.endTime,
        room: updated.room,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
