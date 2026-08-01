import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDays, toUtcDateString } from "../../utils/attendanceAvailability";
import { round2 } from "../../utils/dayAttendance";

const MAX_RANGE_DAYS = 366;

export const attendanceRange = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let from = req.query.from ? new Date(req.query.from as string) : new Date(today);
    let to = req.query.to ? new Date(req.query.to as string) : new Date(today);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(0, 0, 0, 0);

    if (from > to) {
      return res.status(400).json({ error: "from must be on or before to" });
    }

    const rangeDays = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
    if (rangeDays > MAX_RANGE_DAYS) {
      return res.status(400).json({ error: `Date range cannot exceed ${MAX_RANGE_DAYS} days` });
    }

    const schoolId = req.user.schoolId;
    const classId = req.query.classId as string | undefined;

    const [totalStudents, attendance, classifications] = await Promise.all([
      prisma.student.count({
        where: { schoolId, status: "ACTIVE", ...(classId ? { classId } : {}) },
      }),
      prisma.attendance.findMany({
        where: {
          student: { schoolId, status: "ACTIVE" },
          ...(classId ? { classId } : {}),
          date: { gte: from, lte: to },
        },
        select: { date: true, status: true },
      }),
      classifySchoolDays(
        schoolId,
        Array.from({ length: rangeDays }, (_, i) => {
          const d = new Date(from);
          d.setUTCDate(from.getUTCDate() + i);
          return d;
        }),
      ),
    ]);

    const dayPresent = new Map<string, number>();
    for (const a of attendance) {
      if (a.status !== "present") continue;
      const key = toUtcDateString(a.date);
      dayPresent.set(key, (dayPresent.get(key) || 0) + 1);
    }

    const days: { date: string; percentage: number }[] = [];

    for (let i = 0; i < rangeDays; i++) {
      const date = new Date(from);
      date.setUTCDate(from.getUTCDate() + i);
      const dateStr = toUtcDateString(date);
      const classification = classifications.get(dateStr);

      if (!classification || !classification.available) continue;

      const present = dayPresent.get(dateStr) || 0;
      const percentage = totalStudents > 0 ? round2((present / totalStudents) * 100) : 0;
      days.push({ date: dateStr, percentage });
    }

    res.json({ days });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Range");
    res.status(errorResponse.status).json(errorResponse);
  }
};
