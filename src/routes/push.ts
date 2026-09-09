import { Response, Router } from "express";
import { AuthRequest } from "../types";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { createErrorResponse } from "../utils/errorHandler";
import { getVapidPublicKey } from "../utils/webPush";

const router = Router();

// Public: the SW needs the application server key before the user logs in.
router.get("/vapid-public-key", async (_req: AuthRequest, res: Response) => {
  try {
    const key = await getVapidPublicKey();
    if (!key) {
      return res.status(503).json({ error: "Push notifications not configured" });
    }
    res.json({ publicKey: key });
  } catch (error) {
    const err = createErrorResponse(error, "Push Vapid Key");
    res.status(err.status).json(err);
  }
});

// Save a device subscription for the authenticated user.
router.post(
  "/subscribe",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const sub = req.body?.subscription;
      const endpoint: string = sub?.endpoint;
      const p256dh: string = sub?.keys?.p256dh;
      const auth: string = sub?.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: "Invalid push subscription" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, schoolId: true },
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId: user.id,
          schoolId: user.schoolId,
          endpoint,
          p256dh,
          auth,
          userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
        },
        update: { p256dh, auth },
      });

      res.status(201).json({ ok: true });
    } catch (error) {
      const err = createErrorResponse(error, "Push Subscribe");
      res.status(err.status).json(err);
    }
  },
);

// Remove a device subscription (user turned notifications off).
router.post(
  "/unsubscribe",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const endpoint: string = req.body?.endpoint;
      if (!endpoint) {
        return res.status(400).json({ error: "endpoint is required" });
      }

      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user.userId },
      });

      res.json({ ok: true });
    } catch (error) {
      const err = createErrorResponse(error, "Push Unsubscribe");
      res.status(err.status).json(err);
    }
  },
);

export default router;