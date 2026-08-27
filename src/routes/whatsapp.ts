import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { whatsappStatus } from "../controllers/whatsappController";

const router = Router();

router.get("/status", authenticateToken, requireAdmin(), whatsappStatus);

router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("[whatsapp-webhook] Verified");
    res.status(200).send(challenge);
  } else {
    console.warn("[whatsapp-webhook] Verification failed", { mode, token });
    res.sendStatus(403);
  }
});

router.post("/webhook", (req: Request, res: Response) => {
  const body = req.body;

  if (body.object !== "whatsapp_business_account") {
    res.sendStatus(404);
    return;
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === "messages") {
        const value = change.value;

        if (value.messages) {
          for (const msg of value.messages) {
            console.log(`[whatsapp-webhook] Inbound message from ${msg.from}:`, msg.type);
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`[whatsapp-webhook] Status update: ${status.status} for ${status.id}`);
          }
        }
      }
    }
  }

  res.sendStatus(200);
});

export default router;
