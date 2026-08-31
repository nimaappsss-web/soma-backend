import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { whatsappStatus } from "../controllers/whatsappController";

const router = Router();

router.get("/status", authenticateToken, requireAdmin(), whatsappStatus);

// Twilio webhook. Twilio POSTs application/x-www-form-urlencoded data here when
// messages are received or their status changes.
router.post("/webhook", (req: Request, res: Response) => {
  const body = req.body || {};

  const from = body.From || "unknown";
  const to = body.To || "unknown";
  const messageStatus = body.SmsStatus || body.MessageStatus || null;
  const msgType = body.NumMedia && Number(body.NumMedia) > 0 ? "media" : "text";

  if (messageStatus) {
    console.log(`[whatsapp-webhook] Status update: ${messageStatus} for ${to} (sid ${body.SmsMessageSid || ""})`);
  } else {
    console.log(`[whatsapp-webhook] Inbound message from ${from}: type=${msgType}`);
    if (body.Body) {
      console.log(`[whatsapp-webhook] Body: ${body.Body}`);
    }
  }

  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");
});

export default router;
