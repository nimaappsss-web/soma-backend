import { Request, Response } from "express";
import { isCloudApiConfigured } from "../../utils/whatsappCloud";

export const whatsappStatus = async (_req: Request, res: Response) => {
  const configured = isCloudApiConfigured();
  res.json({
    connected: configured,
    mode: configured ? "twilio" : "not_configured",
    from: configured ? process.env.TWILIO_WHATSAPP_FROM : null,
  });
};
