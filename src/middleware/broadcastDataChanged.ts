import { Request, Response, NextFunction } from "express";
import { broadcastToUser } from "../utils/sse";
import { markDataChanged } from "../utils/dataVersion";

// Non-GET endpoints that only touch auth plumbing (token refresh, profile
// reads backed by writes, data-version bookkeeping) — broadcasting them just
// makes the writing device echo back its own /me + /data-version fetches.
const SKIP_PATHS = new Set<string>([
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/data-version",
]);

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

  if (SKIP_PATHS.has(req.path)) {
    return next();
  }

  res.on("finish", () => {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return;
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    markDataChanged(userId);

    const deviceId =
      typeof req.headers["x-device-id"] === "string"
        ? req.headers["x-device-id"]
        : null;

    broadcastToUser(
      userId,
      "data-changed",
      {
        method,
        path: req.originalUrl,
        changedAt: new Date().toISOString(),
      },
      deviceId,
    );
  });

  next();
};