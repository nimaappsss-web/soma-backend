import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listEvents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { from, to, type } = req.query;

    const where: any = { schoolId: req.user.schoolId };
    if (type) where.type = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    const includeHolidays = !type || type === "HOLIDAY";

    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where,
        orderBy: { date: "asc" },
      }),
      includeHolidays
        ? prisma.holiday.findMany({
            where: {
              schoolId: req.user.schoolId,
              ...(from || to ? { date: {
                ...(from ? { gte: new Date(from as string) } : {}),
                ...(to ? { lte: new Date(to as string) } : {}),
              } } : {}),
            },
            orderBy: { date: "asc" },
            select: { id: true, date: true, reason: true, createdBy: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const userIds = [...new Set(events.map((e) => e.createdBy))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const holidayItems = holidays.map((h) => ({
      id: h.id,
      title: h.reason,
      description: "Holiday",
      date: h.date,
      type: "HOLIDAY",
      audience: "ALL",
      source: "holiday",
      createdBy: { id: h.createdBy, name: "Unknown" },
      createdAt: h.createdAt,
    }));

    res.json({
      events: [
        ...holidayItems,
        ...events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.date,
          type: e.type,
          audience: e.audience,
          source: "event",
          createdBy: userMap[e.createdBy] ? { id: e.createdBy, name: userMap[e.createdBy].name } : { id: e.createdBy, name: "Unknown" },
        })),
      ],
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Events");
    res.status(errorResponse.status).json(errorResponse);
  }
};
