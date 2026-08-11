import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { findBusyTeachers, getClassSubjectsWithTeachers } from "../../utils/timetable";

export const getTimetableBuild = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId } = req.params;

    const classInfo = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
    });
    if (!classInfo) {
      return res.status(404).json({ error: "Class not found" });
    }

    const subjects = await getClassSubjectsWithTeachers(req.user.schoolId, classId);

    const existing = await prisma.timetable.findFirst({
      where: { schoolId: req.user.schoolId, classId },
    });

    const existingEntries = existing
      ? await prisma.timetableEntry.findMany({
          where: { schoolId: req.user.schoolId, classId },
          orderBy: [{ day: "asc" }, { period: "asc" }],
        })
      : [];

    const busyTeachers = await findBusyTeachers(req.user.schoolId, classId);

    res.json({
      class: { id: classInfo.id, name: classInfo.name },
      subjects,
      breaks: (existing?.breaks as unknown as { day: string; label: string; start: string; end: string }[] | null) ?? [],
      title: existing?.title ?? "",
      entries: existingEntries.map((e) => ({
        id: e.id,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
        day: e.day,
        period: e.period,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
      })),
      busyTeachers,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Timetable Build");
    res.status(errorResponse.status).json(errorResponse);
  }
};