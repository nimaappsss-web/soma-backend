import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { audience, priority } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId: req.user.schoolId };
    if (audience) where.audience = audience;
    if (priority) where.priority = priority;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    const userIds = [...new Set(announcements.map((a) => a.createdBy))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        audience: a.audience,
        priority: a.priority,
        createdBy: userMap[a.createdBy] ? { id: a.createdBy, name: userMap[a.createdBy].name } : { id: a.createdBy, name: "Unknown" },
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Announcements");
    res.status(errorResponse.status).json(errorResponse);
  }
};
