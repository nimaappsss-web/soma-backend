import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const eventDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const creator = await prisma.user.findUnique({
      where: { id: event.createdBy },
      select: { id: true, name: true },
    });

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        type: event.type,
        audience: event.audience,
        createdBy: creator ? { id: creator.id, name: creator.name } : { id: event.createdBy, name: "Unknown" },
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Event Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
