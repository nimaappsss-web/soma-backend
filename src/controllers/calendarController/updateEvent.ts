import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, description, date, type, audience } = req.body;

    const event = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(audience !== undefined ? { audience } : {}),
      },
    });

    const creator = await prisma.user.findUnique({
      where: { id: updated.createdBy },
      select: { id: true, name: true },
    });

    res.json({
      event: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        date: updated.date,
        type: updated.type,
        audience: updated.audience,
        createdBy: creator ? { id: creator.id, name: creator.name } : { id: updated.createdBy, name: "Unknown" },
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Event");
    res.status(errorResponse.status).json(errorResponse);
  }
};
