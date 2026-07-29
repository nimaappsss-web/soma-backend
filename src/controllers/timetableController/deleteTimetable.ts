import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteTimetable = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const entry = await prisma.timetableEntry.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!entry) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    await prisma.timetableEntry.delete({ where: { id: req.params.id } });

    res.json({ message: "Timetable entry deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Timetable");
    res.status(errorResponse.status).json(errorResponse);
  }
};
