import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

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
    holidayDate.setHours(0, 0, 0, 0);

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
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Holiday");
    res.status(errorResponse.status).json(errorResponse);
  }
};
