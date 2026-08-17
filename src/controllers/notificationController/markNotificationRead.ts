import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });

    res.json({ notification: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Mark Notification Read");
    res.status(errorResponse.status).json(errorResponse);
  }
};