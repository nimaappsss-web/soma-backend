import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const announcementDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const announcement = await prisma.announcement.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    const creator = await prisma.user.findUnique({
      where: { id: announcement.createdBy },
      select: { id: true, name: true },
    });

    res.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        audience: announcement.audience,
        priority: announcement.priority,
        createdBy: creator ? { id: creator.id, name: creator.name } : { id: announcement.createdBy, name: "Unknown" },
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Announcement Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
