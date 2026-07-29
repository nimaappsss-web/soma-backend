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

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { date: "asc" },
    });

    const userIds = [...new Set(events.map((e) => e.createdBy))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        type: e.type,
        audience: e.audience,
        createdBy: userMap[e.createdBy] ? { id: e.createdBy, name: userMap[e.createdBy].name } : { id: e.createdBy, name: "Unknown" },
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Events");
    res.status(errorResponse.status).json(errorResponse);
  }
};
