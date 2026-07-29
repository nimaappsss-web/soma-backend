import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, message, audience, priority } = req.body;

    if (!title || !message || !audience) {
      return res.status(400).json({ error: "title, message, and audience are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true },
    });

    const announcement = await prisma.announcement.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        title,
        message,
        audience,
        priority: priority || "NORMAL",
        createdBy: req.user.userId,
      },
    });

    res.status(201).json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        audience: announcement.audience,
        priority: announcement.priority,
        createdBy: user ? { id: user.id, name: user.name } : { id: req.user.userId, name: "Unknown" },
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Announcement");
    res.status(errorResponse.status).json(errorResponse);
  }
};
