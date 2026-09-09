import { envGet } from "./renderSecrets";
import { prisma } from "./prisma";

export interface TelegramInlineButton {
  text: string;
  callbackData: string;
}

const getSetting = async (key: string): Promise<string> => {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row) {
      const value = JSON.parse(row.value);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    /* fall through */
  }
  return "";
};

export const getTelegramConfig = async () => ({
  token: (await getSetting("telegramBotToken")) || envGet("TELEGRAM_BOT_TOKEN") || "",
  chatId: (await getSetting("telegramChatId")) || envGet("TELEGRAM_CHAT_ID") || "",
});

export const isTelegramConfigured = async (): Promise<boolean> => {
  const { token, chatId } = await getTelegramConfig();
  return !!token && !!chatId;
};

// Send a message to an arbitrary chat (e.g. a school user's linked private
// chat with the bot). Token comes from bot config, not a required chatId.
export const sendTelegramToChat = async (
  token: string,
  chatId: number | string,
  text: string,
): Promise<{ ok: boolean; error?: string }> => {
  if (!token || !chatId) {
    return { ok: false, error: "Telegram not configured" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Telegram send failed" };
  }
};

export const sendTelegramAlert = async (
  text: string,
  options?: { buttons?: TelegramInlineButton[][] },
): Promise<{ ok: boolean; error?: string }> => {
  const { token, chatId } = await getTelegramConfig();
  if (!token || !chatId) {
    return { ok: false, error: "Telegram not configured" };
  }

  const replyMarkup =
    options?.buttons && options.buttons.length > 0
      ? {
          inline_keyboard: options.buttons.map((row) =>
            row.map((button) => ({
              text: button.text,
              callback_data: button.callbackData,
            })),
          ),
        }
      : undefined;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Telegram send failed" };
  }
};