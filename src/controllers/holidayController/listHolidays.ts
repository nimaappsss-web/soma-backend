import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listHolidays = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { from, to } = req.query;

    const where: any = { schoolId: req.user.schoolId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
      select: { id: true, date: true, reason: true, createdBy: true, createdAt: true },
    });

    res.json({ holidays });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Holidays");
    res.status(errorResponse.status).json(errorResponse);
  }
};
