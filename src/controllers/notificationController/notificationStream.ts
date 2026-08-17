import { Response } from "express";
import { AuthRequest } from "../../types";
import { verifyToken } from "../../utils/jwt";
import { addSseClient } from "../../utils/sse";

// EventSource cannot set custom headers, so the stream authenticates via the
// Authorization header (fetch/axios) OR the NIMA_TOKEN cookie (EventSource).
const readCookie = (header: string | undefined, name: string): string | null => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
};

export const notificationStream = (req: AuthRequest, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader?.split(" ")[1] ||
    readCookie(req.headers.cookie, "NIMA_TOKEN") ||
    (typeof req.query.token === "string" ? req.query.token : null);

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }

  if (!payload.userId) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  req.user = payload;

  // Keep the TCP socket open indefinitely (Express defaults to a 2min idle timeout).
  req.socket.setTimeout(0);
  res.setTimeout(0);

  addSseClient(payload.userId, res);
};