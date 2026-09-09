import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyMany } from "../../utils/notifications";
import { getTelegramConfig, sendTelegramToChat } from "../../utils/telegram";

export const replySchoolMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
          select: { id: true },
        },
      },
    });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const created = await prisma.schoolSupportMessage.create({
      data: {
        schoolId: id,
        userId: req.user.userId,
        message: message.trim().slice(0, 2000),
      },
    });

    const adminIds = school.users.map((u) => u.id);
    void notifyMany(id, adminIds, {
      title: "Reply from the Nima team",
      message: message.trim().slice(0, 200),
      type: "SUPPORT",
      route: "/login",
    });

    if (school.supportTgChatId) {
      void (async () => {
        try {
          const { token } = await getTelegramConfig();
          if (token) {
            await sendTelegramToChat(token, school.supportTgChatId!, `💬 Soma team reply:\n\n${message.trim().slice(0, 2000)}`);
          }
        } catch (error) {
          console.error("[replySchoolMessage] telegram delivery failed:", error);
        }
      })();
    }

    res.status(201).json({
      message: "Reply sent",
      item: created,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin School Reply");
    res.status(errorResponse.status).json(errorResponse);
  }
};