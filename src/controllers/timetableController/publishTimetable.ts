import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  findBusyTeachers,
  findConflicts,
  resolveSubjectTeacher,
  type BreakInput,
} from "../../utils/timetable";

interface PublishEntry {
  subjectId: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
}

export const publishTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const { classId, title, breaks, entries } = req.body as {
      classId: string;
      title: string;
      breaks?: BreakInput[];
      entries?: PublishEntry[];
    };

    if (!classId || !title) {
      return res.status(400).json({ error: "classId and title are required" });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Publish requires at least one timetable entry" });
    }

    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
    });
    if (!classExists) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Resolve teacher per subject (auto-attach) and validate duplicates.
    const seen = new Set<string>();
    const resolved: Array<PublishEntry & { teacherId: string; teacherName: string }> = [];
    const validationErrors: Array<{ subjectId: string; reason: string }> = [];

    for (const entry of entries) {
      const key = `${entry.day}:${entry.period}`;
      if (seen.has(key)) {
        return res.status(400).json({ error: `Duplicate slot for ${entry.day} period ${entry.period}` });
      }
      seen.add(key);

      const teacher = await resolveSubjectTeacher(req.user.schoolId, classId, entry.subjectId);
      if (!teacher) {
        validationErrors.push({ subjectId: entry.subjectId, reason: "no-teacher" });
        continue;
      }
      resolved.push({ ...entry, ...teacher });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: "Some subjects have no assigned teacher", details: validationErrors });
    }

    // Block publish if any teacher is already booked elsewhere at the same time.
    const busy = await findBusyTeachers(req.user.schoolId, classId);
    const conflicts = findConflicts(resolved.map((e) => ({ ...e, teacherId: e.teacherId })), busy);
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "Teacher schedule conflict", conflicts });
    }

    const header = await prisma.$transaction(async (tx) => {
      const existing = await tx.timetable.findFirst({
        where: { schoolId, classId },
      });

      const header = existing
        ? await tx.timetable.update({
            where: { id: existing.id },
            data: {
              title,
              breaks:
                breaks && breaks.length
                  ? (breaks as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              updatedAt: new Date(),
            },
          })
        : await tx.timetable.create({
            data: {
              schoolId,
              classId,
              title,
              breaks:
                breaks && breaks.length
                  ? (breaks as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            },
          });

      await tx.timetableEntry.deleteMany({
        where: { schoolId, classId },
      });

      if (resolved.length > 0) {
        await tx.timetableEntry.createMany({
          data: resolved.map((e) => ({
            schoolId,
            classId,
            subjectId: e.subjectId,
            teacherId: e.teacherId,
            day: e.day,
            period: e.period,
            startTime: e.startTime,
            endTime: e.endTime,
            timetableId: header.id,
          })),
        });
      }

      return header;
    });

    const saved = await prisma.timetableEntry.findMany({
      where: { schoolId: req.user.schoolId, classId },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ day: "asc" }, { period: "asc" }],
    });

    res.status(201).json({
      timetable: {
        id: header.id,
        classId,
        className: classExists.name,
        title: header.title,
        breaks: (header.breaks as unknown as BreakInput[] | null) ?? [],
        entries: saved.map((e) => ({
          id: e.id,
          classId: e.classId,
          className: classExists.name,
          subjectId: e.subject.id,
          subjectName: e.subject.name,
          teacherId: e.teacher.id,
          teacherName: e.teacher.name,
          day: e.day,
          period: e.period,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
      },
      conflicts: [],
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Publish Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};