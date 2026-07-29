import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, message, audience, priority } = req.body;

    const announcement = await prisma.announcement.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(audience !== undefined ? { audience } : {}),
        ...(priority !== undefined ? { priority } : {}),
      },
    });

    const creator = await prisma.user.findUnique({
      where: { id: updated.createdBy },
      select: { id: true, name: true },
    });

    res.json({
      announcement: {
        id: updated.id,
        title: updated.title,
        message: updated.message,
        audience: updated.audience,
        priority: updated.priority,
        createdBy: creator ? { id: creator.id, name: creator.name } : { id: updated.createdBy, name: "Unknown" },
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Announcement");
    res.status(errorResponse.status).json(errorResponse);
  }
};
