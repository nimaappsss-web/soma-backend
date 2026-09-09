import webpush from "web-push";
import { prisma } from "./prisma";
import { envGet } from "./renderSecrets";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string | null;
  data?: Record<string, unknown> | null;
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

export const getVapidPublicKey = async (): Promise<string> => {
  return (
    (await getSetting("vapidPublicKey")) ||
    envGet("VAPID_PUBLIC_KEY") ||
    ""
  );
};

let initialized = false;
const configure = async (): Promise<boolean> => {
  if (initialized) return true;
  const publicKey = await getVapidPublicKey();
  const privateKey =
    (await getSetting("vapidPrivateKey")) ||
    envGet("VAPID_PRIVATE_KEY") ||
    "";
  const subject =
    (await getSetting("vapidSubject")) ||
    envGet("VAPID_SUBJECT") ||
    "mailto:support@soma.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
  return true;
};

const GONE_STATUSES = new Set([404, 410]);

// Send a native push to every device subscription belonging to the given
// users. Best-effort: expired subscriptions are pruned, errors are logged.
export const sendPushToUsers = async (
  userIds: string[],
  payload: PushPayload,
): Promise<void> => {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  if (!(await configure())) return;

  let subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;
  try {
    subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: unique } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch (error) {
    console.error("[webPush] subscription lookup failed:", error);
    return;
  }
  if (subscriptions.length === 0) return;

  const notification = {
    title: payload.title,
    body: payload.body ?? "",
    data: payload.data ?? {},
    url: payload.url ?? "/",
  };

  const removeIds: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(notification),
        );
      } catch (error: any) {
        if (typeof error?.statusCode === "number" && GONE_STATUSES.has(error.statusCode)) {
          removeIds.push(sub.id);
        } else {
          console.error(
            "[webPush] send failed for",
            sub.endpoint,
            ":",
            error?.message ?? error,
          );
        }
      }
    }),
  );

  if (removeIds.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: removeIds } } });
    } catch (error) {
      console.error("[webPush] prune failed:", error);
    }
  }
};

export const sendPushToSchool = async (
  schoolId: string,
  payload: PushPayload,
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId, active: true },
      select: { id: true },
    });
    await sendPushToUsers(
      users.map((u) => u.id),
      payload,
    );
  } catch (error) {
    console.error("[webPush] school lookup failed:", error);
  }
};