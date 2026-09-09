import { prisma } from "../utils/prisma";
import {
  getTelegramConfig,
  TelegramInlineButton,
} from "../utils/telegram";
import {
  approveSchoolById,
  rejectSchoolById,
} from "../services/schoolApproval";
import { notifyPlatformAdmins } from "../utils/platformNotify";
import { notifyMany } from "../utils/notifications";

interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramBotConfig {
  token: string;
  chatId: string;
}

const LAST_OFFSET_KEY = "telegramLastOffset";

let running = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callApi = async (
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<any> => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (!data.ok) {
    throw new Error(
      `Telegram ${method} failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  return data.result;
};

const sendMessage = async (
  token: string,
  chatId: number | string,
  text: string,
  buttons?: TelegramInlineButton[][],
): Promise<void> => {
  const replyMarkup =
    buttons && buttons.length > 0
      ? {
          inline_keyboard: buttons.map((row) =>
            row.map((button) => ({
              text: button.text,
              callback_data: button.callbackData,
            })),
          ),
        }
      : undefined;

  await callApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
};

const answerCallbackQuery = async (
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> => {
  await callApi(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
};

const loadOffset = async (): Promise<number> => {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: LAST_OFFSET_KEY },
    });
    if (row) {
      const parsed = JSON.parse(row.value);
      const value = typeof parsed === "number" ? parsed : Number(parsed);
      if (Number.isFinite(value) && value >= 0) return value;
    }
  } catch {
    /* ignore */
  }
  return 0;
};

const saveOffset = async (offset: number): Promise<void> => {
  try {
    await prisma.platformSetting.upsert({
      where: { key: LAST_OFFSET_KEY },
      create: { key: LAST_OFFSET_KEY, value: JSON.stringify(offset) },
      update: { value: JSON.stringify(offset) },
    });
  } catch (error) {
    console.error("[telegram-bot] failed to save offset:", error);
  }
};

interface SchoolLookup {
  id: string;
  name: string;
  schoolCode: string | null;
  approvalStatus: string;
  supportTgChatId?: string | null;
}

const findSchoolByKey = async (key: string): Promise<SchoolLookup | null> => {
  const trimmed = key.trim();
  if (!trimmed) return null;

  const byCode = await prisma.school.findFirst({
    where: { schoolCode: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true, schoolCode: true, approvalStatus: true, supportTgChatId: true },
  });
  if (byCode) return byCode;

  const byId = await prisma.school.findUnique({
    where: { id: trimmed },
    select: { id: true, name: true, schoolCode: true, approvalStatus: true, supportTgChatId: true },
  });
  if (byId) return byId;

  return prisma.school.findFirst({
    where: { name: { contains: trimmed, mode: "insensitive" } },
    select: { id: true, name: true, schoolCode: true, approvalStatus: true, supportTgChatId: true },
  });
};

const findSchoolByTgChat = async (
  chatId: number | string,
): Promise<SchoolLookup | null> => {
  const chat = String(chatId);
  return prisma.school.findFirst({
    where: { supportTgChatId: chat },
    select: { id: true, name: true, schoolCode: true, approvalStatus: true, supportTgChatId: true },
  });
};

// The author recorded on reply rows. Prefer a SUPER_ADMIN (matches how the
// portal attributes team replies); fall back to the school principal so the
// FK always resolves.
const resolveTeamAuthorId = async (schoolId: string): Promise<string | null> => {
  const team = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", active: true },
    select: { id: true },
  });
  if (team) return team.id;
  const admin = await prisma.user.findFirst({
    where: { schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
    select: { id: true },
  });
  return admin?.id ?? null;
};

const listPendingSchools = async (): Promise<SchoolLookup[]> =>
  prisma.school.findMany({
    where: { approvalStatus: "PENDING" },
    select: { id: true, name: true, schoolCode: true, approvalStatus: true },
    orderBy: { createdAt: "asc" },
  });

const HELP_TEXT = [
  "Soma super-admin bot",
  "",
  "/pending — list schools awaiting approval",
  "/approve <code> — approve a school",
  "/reject <code> <reason> — reject a school with a reason",
  "/status <code> — check a school's status",
  "/reply <code> <message> — reply to a school (delivered to their linked Telegram)",
  "",
  "For schools: send /link <schoolCode> from a private chat to receive Soma replies here.",
].join("\n");

// ---- APP side (any private chat) ----

const handleLink = async (
  config: TelegramBotConfig,
  chatId: number,
  key: string,
): Promise<void> => {
  const school = await findSchoolByKey(key);
  const sendReply = (t: string) => sendMessage(config.token, chatId, t);
  if (!school) {
    await sendReply(`No school matches "${key}". Use your school code, e.g. /link ABC123`);
    return;
  }
  await prisma.school.update({
    where: { id: school.id },
    data: { supportTgChatId: String(chatId) },
  });
  await sendReply(
    `Hello ${school.name} 👋\n\nYour Telegram is now linked. Soma-team replies will be delivered here, and you can message the team by sending me a text.`,
  );
};

const forwardSchoolMessage = async (
  config: TelegramBotConfig,
  chatId: number,
  school: SchoolLookup,
  text: string,
): Promise<void> => {
  const sendReply = (t: string) => sendMessage(config.token, chatId, t);

  const author =
    (await resolveTeamAuthorId(school.id)) ||
    (await prisma.user.findFirst({
      where: { schoolId: school.id },
      select: { id: true },
    }))?.id;
  if (!author) {
    await sendReply("⚠️ Could not attribute this message — contact support.");
    return;
  }

  await prisma.schoolSupportMessage.create({
    data: {
      schoolId: school.id,
      userId: author,
      message: text.slice(0, 2000),
    },
  });

  await notifyPlatformAdmins({
    title: "New follow-up (via Telegram)",
    message: `School: ${school.name} (${school.schoolCode || "no code"})\n\n${text.slice(0, 200)}`,
    type: "SUPPORT",
    data: { schoolId: school.id, schoolName: school.name },
    telegramText: `💬 Follow-up from ${school.name} (${school.schoolCode || "no code"}) via Telegram\n\n📝 ${text.slice(0, 200)}\n\nReply with: /reply ${school.schoolCode || school.id} <message>`,
  });

  const adminIds = (
    await prisma.user.findMany({
      where: { schoolId: school.id, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
      select: { id: true },
    })
  ).map((u) => u.id);
  void notifyMany(school.id, adminIds, {
    title: "Message sent to Soma team",
    message: `We received "${text.slice(0, 120)}". The team will reply here and in your support thread.`,
    type: "SUPPORT",
    route: "/",
  });

  await sendReply("✓ Got it. The Soma team has been notified — we'll reply to you here.");
};

const handleLinkOrForward = async (
  config: TelegramBotConfig,
  message: TelegramMessage,
): Promise<void> => {
  const chatId = message.chat.id;
  if (message.chat.type !== "private") return;
  const text = (message.text || "").trim();
  if (!text) return;

  const sendReply = (t: string) => sendMessage(config.token, chatId, t);

  const linkMatch = text.match(/^\/link\s+(.+)$/i);
  if (linkMatch) {
    await handleLink(config, chatId, linkMatch[1]);
    return;
  }

  const school = await findSchoolByTgChat(chatId);
  if (school) {
    await forwardSchoolMessage(config, chatId, school, text);
    return;
  }

  await sendReply(
    "Hi! To link this chat to your school so you can message the Soma team here, send:\n/link <schoolCode>",
  );
};

// ---- TEAM side (authorized chat) ----

const handleReply = async (
  config: TelegramBotConfig,
  teamChatId: number,
  rest: string,
): Promise<void> => {
  const sendReply = (t: string) => sendMessage(config.token, teamChatId, t);
  const [key, ...msgParts] = rest.split(/\s+/);
  const message = msgParts.join(" ").trim();
  if (!key || !message) {
    await sendReply(`Usage: /reply <code> <message>\nExample: /reply ABC123 Thanks, one of our agents will review today.`);
    return;
  }
  const school = await findSchoolByKey(key);
  if (!school) {
    await sendReply(`No school matches "${key}".`);
    return;
  }

  const authorId = await resolveTeamAuthorId(school.id);
  if (!authorId) {
    await sendReply("⚠️ Could not resolve an author for this reply.");
    return;
  }

  await prisma.schoolSupportMessage.create({
    data: {
      schoolId: school.id,
      userId: authorId,
      message: message.slice(0, 2000),
    },
  });

  const adminIds = (
    await prisma.user.findMany({
      where: { schoolId: school.id, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
      select: { id: true },
    })
  ).map((u) => u.id);
  void notifyMany(school.id, adminIds, {
    title: "Reply from the Soma team",
    message: message.slice(0, 200),
    type: "SUPPORT",
    route: "/",
  });

  if (school.supportTgChatId) {
    void (async () => {
      try {
        await sendMessage(config.token, school.supportTgChatId!, `💬 Soma team reply:\n\n${message}`);
      } catch (error) {
        console.error("[telegram-bot] reply delivery failed:", error);
      }
    })();
    await sendReply(`✅ Reply sent to ${school.name}.`);
  } else {
    await sendReply(`⚠️ ${school.name} hasn't linked Telegram. Reply in the super-admin portal instead.`);
  }
};

const handleMessage = async (
  config: TelegramBotConfig,
  message: TelegramMessage,
): Promise<void> => {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  if (!text) return;

  const sendReply = (replyText: string, buttons?: TelegramInlineButton[][]) =>
    sendMessage(config.token, chatId, replyText, buttons);

  if (text === "/start" || text === "/help") {
    await sendReply(HELP_TEXT);
    return;
  }

  if (text === "/pending") {
    const pending = await listPendingSchools();
    if (pending.length === 0) {
      await sendReply("No schools awaiting approval right now 🎉");
      return;
    }
    const lines = pending.map(
      (school, index) =>
        `${index + 1}. ${school.name} — ${school.schoolCode || "no code"} (/${school.approvalStatus})`,
    );
    await sendReply(`Schools awaiting approval (${pending.length}):\n\n${lines.join("\n")}`);
    return;
  }

  const replyMatch = text.match(/^\/reply\s+(.+)$/i);
  if (replyMatch) {
    await handleReply(config, chatId, replyMatch[1]);
    return;
  }

  const approveMatch = text.match(/^\/approve\s+(.+)$/i);
  if (approveMatch) {
    const school = await findSchoolByKey(approveMatch[1]);
    if (!school) {
      await sendReply(`No school matches "${approveMatch[1]}".`);
      return;
    }
    const result = await approveSchoolById(school.id);
    if (!result.ok) {
      await sendReply(`⚠️ ${result.error}`);
      return;
    }
    await sendReply(`✅ ${school.name} approved.`);
    return;
  }

  const rejectMatch = text.match(/^\/reject\s+(.+)$/i);
  if (rejectMatch) {
    const [key, ...reasonParts] = rejectMatch[1].split(/\s+/);
    const reason = reasonParts.join(" ").trim();
    const school = await findSchoolByKey(key);
    if (!school) {
      await sendReply(`No school matches "${key}".`);
      return;
    }
    if (!reason) {
      await sendReply(
        `Please include a reason: /reject <code> <reason>\n\nFor example: /reject ${school.schoolCode || school.id} Incomplete documentation.`,
      );
      return;
    }
    const result = await rejectSchoolById(school.id, reason);
    if (!result.ok) {
      await sendReply(`⚠️ ${result.error}`);
      return;
    }
    await sendReply(`❌ ${school.name} rejected — ${result.school.rejectionReason}`);
    return;
  }

  const statusMatch = text.match(/^\/status\s+(.+)$/i);
  if (statusMatch) {
    const school = await findSchoolByKey(statusMatch[1]);
    if (!school) {
      await sendReply(`No school matches "${statusMatch[1]}".`);
      return;
    }
    const statusLabel =
      school.approvalStatus === "PENDING"
        ? "⌛ Pending approval"
        : school.approvalStatus === "REJECTED"
          ? "❌ Rejected"
          : "✅ Approved";
    await sendReply(`${school.name} (${school.schoolCode || "no code"}): ${statusLabel}`);
    return;
  }

  if (text.startsWith("/")) {
    await sendReply(HELP_TEXT);
  }
};

const handleCallbackQuery = async (
  config: TelegramBotConfig,
  callback: TelegramCallbackQuery,
): Promise<void> => {
  if (!callback.message) return;
  const chatId = callback.message.chat.id;
  const data = callback.data || "";
  const callbackId = callback.id;

  const approveMatch = data.match(/^approve:(.+)$/i);
  if (approveMatch) {
    await answerCallbackQuery(
      config.token,
      callbackId,
      "Approving…",
    );
    const school = await findSchoolByKey(approveMatch[1]);
    if (!school) {
      await sendMessage(config.token, chatId, `⚠️ No school matches "${approveMatch[1]}".`);
      return;
    }
    const result = await approveSchoolById(school.id);
    await sendMessage(
      config.token,
      chatId,
      result.ok ? `✅ ${school.name} approved.` : `⚠️ ${result.error}`,
    );
    return;
  }

  const rejectMatch = data.match(/^reject:(.+)$/i);
  if (rejectMatch) {
    await answerCallbackQuery(config.token, callbackId);
    await sendMessage(
      config.token,
      chatId,
      `Send the reason to reject:\n/reject ${rejectMatch[1].toUpperCase()} <reason>`,
    );
    return;
  }

  await answerCallbackQuery(config.token, callbackId, "Action not recognized.");
};

export const handleUpdate = async (
  config: TelegramBotConfig,
  update: TelegramUpdate,
): Promise<void> => {
  if (update.message) {
    const chatId = update.message.chat.id;
    const isTeam = chatId === Number(config.chatId);
    if (isTeam) {
      await handleMessage(config, update.message);
    } else {
      await handleLinkOrForward(config, update.message);
    }
  }
  if (update.callback_query) {
    await handleCallbackQuery(config, update.callback_query);
  }
};

export const startSomaBot = async (): Promise<void> => {
  if (running) return;
  const { token, chatId } = await getTelegramConfig();
  if (!token || !chatId) {
    console.warn("[telegram-bot] Not started — no bot token / chat id configured");
    return;
  }
  running = true;
  const config: TelegramBotConfig = { token, chatId: String(chatId) };

  let offset = (await loadOffset()) + 1;
  console.log("[telegram-bot] polling started (offset", offset, ")");

  for (;;) {
    try {
      const updates: TelegramUpdate[] = await callApi(token, "getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });

      if (!updates || updates.length === 0) {
        await sleep(1500);
        continue;
      }

      for (const update of updates) {
        offset = update.update_id;
        try {
          await handleUpdate(config, update);
        } catch (error) {
          console.error("[telegram-bot] update handling failed:", error);
        }
        offset = update.update_id + 1;
        await saveOffset(offset);
      }
    } catch (error) {
      console.error("[telegram-bot] poll error:", (error as Error).message);
      await sleep(5000);
    }
  }
};