import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true },
    });

    res.json({ count: result.count });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Mark All Notifications Read");
    res.status(errorResponse.status).json(errorResponse);
  }
};