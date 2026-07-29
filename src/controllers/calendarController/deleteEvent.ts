import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteEvent = async (req: AuthRequest, res: Response) => {
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

    await prisma.calendarEvent.delete({ where: { id: req.params.id } });

    res.json({ message: "Event deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Event");
    res.status(errorResponse.status).json(errorResponse);
  }
};
