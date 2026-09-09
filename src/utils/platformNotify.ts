import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma/client";
import { sendTelegramAlert, TelegramInlineButton } from "./telegram";
import { sendAppEmail } from "./email";
import { envGet } from "./renderSecrets";
import { sendPushToUsers } from "./webPush";

export type PlatformNotifType =
  | "PLATFORM"
  | "REGISTRATION"
  | "SUPPORT"
  | "APPROVAL";

export interface PlatformNotifOptions {
  title: string;
  message: string;
  type: PlatformNotifType;
  data?: Record<string, unknown> | null;
  email?: {
    to: string;
    subject: string;
    html: string;
  } | null;
  telegramText?: string | null;
  telegramButtons?: TelegramInlineButton[][];
}

// The support/contact email shown to schools (backed by PlatformSetting
// "contactEmail", env ADMIN_EMAIL as fallback).
export const getSupportEmail = async (): Promise<string> => {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: "contactEmail" },
    });
    if (row) {
      try {
        const value = JSON.parse(row.value);
        if (typeof value === "string" && value.trim()) return value.trim();
      } catch {
        /* fall through to env */
      }
    }
  } catch {
    /* ignore DB errors */
  }
  return envGet("ADMIN_EMAIL") || envGet("SUPPORT_EMAIL") || "";
};

// One entry point for all platform-admin alerts: in-app feed row, optional
// email, optional Telegram. Each channel is best-effort and never throws.
export const notifyPlatformAdmins = async (
  options: PlatformNotifOptions,
): Promise<void> => {
  try {
    await prisma.platformNotification.create({
      data: {
        title: options.title,
        message: options.message,
        type: options.type,
        data: (options.data as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (error) {
    console.error("[notifyPlatformAdmins] feed create failed:", error);
  }

  if (options.telegramText) {
    const telegramResult = await sendTelegramAlert(options.telegramText, {
      buttons: options.telegramButtons,
    });
    if (!telegramResult.ok) {
      console.error(
        "[notifyPlatformAdmins] telegram failed:",
        telegramResult.error,
      );
    }
  }

  // Native push to every platform admin's device (laptop/phone). Best-effort;
  // skips silently when VAPID isn't configured or no one has subscribed.
  try {
    const platformAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", active: true },
      select: { id: true },
    });
    void sendPushToUsers(platformAdmins.map((u) => u.id), {
      title: options.title,
      body: options.message,
      url: options.data?.schoolId ? `/admin` : "/admin",
      data: {
        type: options.type,
        ...(options.data ?? {}),
      },
    });
  } catch (error) {
    console.error("[notifyPlatformAdmins] push lookup failed:", error);
  }

  if (options.email && options.email.to) {
    const emailResult = await sendAppEmail(
      options.email.to,
      options.email.subject,
      options.email.html,
    );
    if (!emailResult.ok) {
      console.error("[notifyPlatformAdmins] email failed:", emailResult.error);
    }
  }
};