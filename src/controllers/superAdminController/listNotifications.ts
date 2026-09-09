import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { unreadOnly } = req.query;

    const notifications = await prisma.platformNotification.findMany({
      where: unreadOnly === "true" ? { read: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({
      notifications,
      unreadCount: await prisma.platformNotification.count({
        where: { read: false },
      }),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Notifications");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.platformNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Notifications Read");
    res.status(errorResponse.status).json(errorResponse);
  }
};