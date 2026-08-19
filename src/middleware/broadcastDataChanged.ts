import { Request, Response, NextFunction } from "express";
import { broadcastToUser } from "../utils/sse";
import { markDataChanged } from "../utils/dataVersion";

// After any successful non-GET request, notify the user's other connected
// devices (SSE) that server data changed so they can refetch. This is what
// lets one logged-in device see updates made from another device in real time.
export const broadcastDataChanged = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  res.on("finish", () => {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return;
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    markDataChanged(userId);

    broadcastToUser(userId, "data-changed", {
      method,
      path: req.originalUrl,
      changedAt: new Date().toISOString(),
    });
  });

  next();
};