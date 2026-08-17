import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyMany } from "../../utils/notifications";

export const createHoliday = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date, reason } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ error: "Date and reason are required" });
    }

    const holidayDate = new Date(date);
    holidayDate.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.holiday.findFirst({
      where: { schoolId: req.user.schoolId, date: holidayDate },
    });

    if (existing) {
      return res.status(400).json({ error: "A holiday already exists for this date" });
    }

    const holiday = await prisma.holiday.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        date: holidayDate,
        reason,
        createdBy: req.user.userId,
      },
      select: { id: true, date: true, reason: true, createdBy: true, createdAt: true },
    });

    res.status(201).json({ holiday });

    notifyHoliday(req.user.schoolId, req.user.userId, holiday.id, holidayDate, reason);
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Holiday");
    res.status(errorResponse.status).json(errorResponse);
  }
};

const notifyHoliday = async (
  schoolId: string,
  creatorId: string,
  holidayId: string,
  date: Date,
  reason: string,
) => {
  try {
    const recipients = await prisma.user.findMany({
      where: { schoolId, active: true },
      select: { id: true, role: true },
    });

    const adminIds: string[] = [];
    const parentIds: string[] = [];
    const otherIds: string[] = [];

    for (const r of recipients) {
      if (r.id === creatorId) continue;
      if (r.role === "PRINCIPAL" || r.role === "SCHOOL_ADMIN") adminIds.push(r.id);
      else if (r.role === "PARENT") parentIds.push(r.id);
      else otherIds.push(r.id);
    }

    const dateLabel = date.toISOString().slice(0, 10);
    const message = `School closed on ${dateLabel} — ${reason}`;

    if (adminIds.length) {
      await notifyMany(schoolId, adminIds, {
        title: "School holiday added",
        message,
        type: "HOLIDAY",
        route: "/admin/calendar/holidays",
        data: { holidayId },
      });
    }
    if (parentIds.length) {
      await notifyMany(schoolId, parentIds, {
        title: "School holiday",
        message,
        type: "HOLIDAY",
        route: "/parent/children",
        data: { holidayId },
      });
    }
    if (otherIds.length) {
      await notifyMany(schoolId, otherIds, {
        title: "School holiday",
        message,
        type: "HOLIDAY",
        route: null,
        data: { holidayId },
      });
    }
  } catch (error) {
    console.error("[createHoliday] Notification fan-out failed:", error);
  }
};
