import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

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
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Event");
    res.status(errorResponse.status).json(errorResponse);
  }
};
