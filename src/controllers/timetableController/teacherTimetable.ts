import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const teacherTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { teacherId } = req.params;

    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId: req.user.schoolId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { schoolId: req.user.schoolId, teacherId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ day: "asc" }, { period: "asc" }],
    });

    res.json({
      entries: entries.map((e) => ({
        id: e.id,
        classId: e.class.id,
        className: e.class.name,
        subjectId: e.subject.id,
        subjectName: e.subject.name,
        teacherId: e.teacher.id,
        teacherName: e.teacher.name,
        day: e.day,
        period: e.period,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Teacher Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
