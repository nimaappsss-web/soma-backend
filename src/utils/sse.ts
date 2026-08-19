import { Response } from "express";

// In-memory registry of active SSE connections, keyed by userId.
// Single-instance assumption: fan-out is direct. If the API is scaled to
// multiple instances, replace this with Redis pub/sub.

interface SseClient {
  res: Response;
  deviceId: string | null;
}

const clients = new Map<string, Set<SseClient>>();

const sseHeaders = (res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
};

export const addSseClient = (
  userId: string,
  res: Response,
  deviceId: string | null = null,
) => {
  sseHeaders(res);
  res.write(": connected\n\n");

  let set = clients.get(userId);
  if (!set) {
    set = new Set<SseClient>();
    clients.set(userId, set);
  }
  const client = { res, deviceId };
  set.add(client);

  res.on("close", () => {
    set!.delete(client);
    if (set!.size === 0) clients.delete(userId);
  });
  res.on("error", () => {
    set!.delete(client);
    if (set!.size === 0) clients.delete(userId);
  });
};

export const broadcastToUser = (
  userId: string,
  event: string,
  data: unknown,
  excludeDeviceId?: string | null,
) => {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    if (excludeDeviceId && client.deviceId === excludeDeviceId) continue;
    client.res.write(payload);
  }
};

const sendHeartbeat = () => {
  for (const [, set] of clients) {
    for (const client of set) {
      client.res.write(": ping\n\n");
    }
  }
};

export const startSseHeartbeat = (intervalMs = 25000) => {
  const timer = setInterval(() => sendHeartbeat(), intervalMs);
  return () => clearInterval(timer);
};