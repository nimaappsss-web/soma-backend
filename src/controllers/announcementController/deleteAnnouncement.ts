import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
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

    await prisma.announcement.delete({ where: { id: req.params.id } });

    res.json({ message: "Announcement deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Announcement");
    res.status(errorResponse.status).json(errorResponse);
  }
};
