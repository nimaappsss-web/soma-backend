import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  notifyPlatformAdmins,
  getSupportEmail,
} from "../../utils/platformNotify";
import { sendSupportInquiryEmail } from "../../utils/email";

export const createMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res
        .status(400)
        .json({ error: "A school account is required to send a message" });
    }

    const { message, replyToId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [school, author] = await Promise.all([
      prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: { id: true, name: true, schoolCode: true, createdAt: true },
      }),
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, name: true, email: true },
      }),
    ]);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const created = await prisma.schoolSupportMessage.create({
      data: {
        schoolId: school.id,
        userId: req.user.userId,
        message: message.trim().slice(0, 2000),
        replyToId: replyToId || null,
      },
    });

    const supportEmail = await getSupportEmail();

    const registeredAt = school.createdAt
      ? new Date(school.createdAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

    void notifyPlatformAdmins({
      title: "New support message",
      message: `School: ${school.name} (${school.schoolCode || "no code"}) — registered ${registeredAt}\n\n${message.trim().slice(0, 200)}`,
      type: "SUPPORT",
      data: { schoolId: school.id, schoolName: school.name },
      email: {
        to: supportEmail,
        subject: `New support message from ${school.name} — Nima`,
        html: `<p>A school just sent a message on the Nima platform:</p><blockquote style="border-left:3px solid #1a1a1a;padding:8px 12px;color:#555;">${message}</blockquote><p><strong>School:</strong> ${school.name} (${school.schoolCode || "no code"})</p>` +
          `<p><strong>Registered:</strong> ${registeredAt}</p>` +
          `<p>Reply in the super-admin portal (School → Messages).</p>`,
      },
      telegramText: `💬 Follow-up from ${school.name} (${school.schoolCode || "no code"})\n🕘 Registered ${registeredAt}\n\n📝 ${message
        .trim()
        .slice(0, 200)}`,
    });

    if (author?.email) {
      void sendSupportInquiryEmail(
        author.email,
        school.name,
        author.name || "School team",
        message.trim().slice(0, 2000),
        supportEmail || undefined,
      ).catch(() => {});
    }

    res.status(201).json({
      message: "Message sent successfully",
      item: created,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(
      error,
      "Support Message Create",
    );
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({ error: "A school account is required" });
    }

    const messages = await prisma.schoolSupportMessage.findMany({
      where: { schoolId: req.user.schoolId },
      select: {
        id: true,
        message: true,
        replyToId: true,
        createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ messages });
  } catch (error) {
    const errorResponse = createErrorResponse(
      error,
      "Support Message List",
    );
    res.status(errorResponse.status).json(errorResponse);
  }
};