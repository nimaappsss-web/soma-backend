import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyMany } from "../../utils/notifications";

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, description, date, type, audience } = req.body;

    if (!title || !date || !type) {
      return res.status(400).json({ error: "title, date, and type are required" });
    }

    if (type === "HOLIDAY") {
      return res.status(400).json({ error: "Holidays must be created via /api/holidays" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true },
    });

    const event = await prisma.calendarEvent.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        title,
        description: description || null,
        date: new Date(date),
        type,
        audience: audience || "ALL",
        createdBy: req.user.userId,
      },
    });

    res.status(201).json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        type: event.type,
        audience: event.audience,
        createdBy: user ? { id: user.id, name: user.name } : { id: req.user.userId, name: "Unknown" },
      },
    });

    notifyEventAudience(req.user.schoolId, {
      id: event.id,
      title: event.title,
      date: event.date,
      type: event.type,
      audience: event.audience,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Event");
    res.status(errorResponse.status).json(errorResponse);
  }
};

const notifyEventAudience = async (
  schoolId: string,
  event: { id: string; title: string; date: Date; type: string; audience: string },
) => {
  try {
    const audience = event.audience || "ALL";

    let where: any;
    if (audience === "PARENTS") {
      where = { schoolId, role: "PARENT", active: true };
    } else if (audience === "TEACHERS") {
      where = { schoolId, role: { in: ["TEACHER", "BURSAR", "STAFF", "SCHOOL_ADMIN"] }, active: true };
    } else if (audience === "STAFF") {
      where = { schoolId, role: { in: ["TEACHER", "BURSAR", "STAFF", "SCHOOL_ADMIN"] }, active: true };
    } else {
      where = { schoolId, active: true };
    }

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, role: true },
    });

    const adminIds: string[] = [];
    const parentIds: string[] = [];
    const otherIds: string[] = [];

    for (const r of recipients) {
      if (r.role === "PRINCIPAL" || r.role === "SCHOOL_ADMIN") adminIds.push(r.id);
      else if (r.role === "PARENT") parentIds.push(r.id);
      else otherIds.push(r.id);
    }

    const dateLabel = event.date.toISOString().slice(0, 10);
    const message = `${event.title} — ${dateLabel}`;

    if (adminIds.length) {
      await notifyMany(schoolId, adminIds, {
        title: `Calendar event: ${event.title}`,
        message,
        type: "CALENDAR_EVENT",
        route: "/admin/calendar",
        data: { eventId: event.id },
      });
    }
    if (parentIds.length) {
      await notifyMany(schoolId, parentIds, {
        title: `School event: ${event.title}`,
        message,
        type: "CALENDAR_EVENT",
        route: "/parent/children",
        data: { eventId: event.id },
      });
    }
    if (otherIds.length) {
      await notifyMany(schoolId, otherIds, {
        title: `School event: ${event.title}`,
        message,
        type: "CALENDAR_EVENT",
        route: null,
        data: { eventId: event.id },
      });
    }
  } catch (error) {
    console.error("[createEvent] Notification fan-out failed:", error);
  }
};
