import { Response } from "express";

// In-memory registry of active SSE connections, keyed by userId.
// Single-instance assumption: fan-out is direct. If the API is scaled to
// multiple instances, replace this with Redis pub/sub.
const clients = new Map<string, Set<Response>>();

const sseHeaders = (res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
};

export const addSseClient = (userId: string, res: Response) => {
  sseHeaders(res);
  res.write(": connected\n\n");

  let set = clients.get(userId);
  if (!set) {
    set = new Set<Response>();
    clients.set(userId, set);
  }
  set.add(res);

  res.on("close", () => {
    set!.delete(res);
    if (set!.size === 0) clients.delete(userId);
  });
  res.on("error", () => {
    set!.delete(res);
    if (set!.size === 0) clients.delete(userId);
  });
};

export const broadcastToUser = (userId: string, event: string, data: unknown) => {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
};

const sendHeartbeat = () => {
  for (const [, set] of clients) {
    for (const res of set) {
      res.write(": ping\n\n");
    }
  }
};

export const startSseHeartbeat = (intervalMs = 25000) => {
  const timer = setInterval(() => sendHeartbeat(), intervalMs);
  return () => clearInterval(timer);
};