import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateHoliday = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { date, reason } = req.body;

    const existing = await prisma.holiday.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    const data: any = {};

    if (date !== undefined) {
      const holidayDate = new Date(date);
      holidayDate.setHours(0, 0, 0, 0);

      const duplicate = await prisma.holiday.findFirst({
        where: { schoolId: req.user.schoolId, date: holidayDate, id: { not: id } },
      });

      if (duplicate) {
        return res.status(400).json({ error: "A holiday already exists for this date" });
      }

      data.date = holidayDate;
    }

    if (reason !== undefined) {
      data.reason = reason;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "At least one field (date or reason) is required" });
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data,
      select: { id: true, date: true, reason: true, createdBy: true, createdAt: true },
    });

    res.json({ holiday });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Holiday");
    res.status(errorResponse.status).json(errorResponse);
  }
};
