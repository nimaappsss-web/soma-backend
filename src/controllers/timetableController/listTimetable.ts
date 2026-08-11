import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, day } = req.query;

    const where: any = { schoolId: req.user.schoolId };
    if (classId) where.classId = classId;
    if (day) where.day = day;

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ day: "asc" }, { period: "asc" }],
    });

    let breaks: { day: string; label: string; start: string; end: string }[] = [];
    // Per-class breaks for the school-wide query — the frontend hydrates its
    // Dexie `timetables` headers from this so "copy schedule" can read breaks.
    let breaksByClass: Record<string, { day: string; label: string; start: string; end: string }[]> = {};
    if (classId) {
      const header = await prisma.timetable.findFirst({
        where: { schoolId: req.user.schoolId, classId: classId as string },
      });
      if (header?.breaks) breaks = header.breaks as unknown as typeof breaks;
    } else {
      const headers = await prisma.timetable.findMany({
        where: { schoolId: req.user.schoolId },
      });
      for (const h of headers) {
        if (h.breaks) breaksByClass[h.classId] = h.breaks as unknown as typeof breaksByClass[string];
      }
    }

    res.json({
      breaks,
      breaksByClass,
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
        timetableId: e.timetableId,
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
