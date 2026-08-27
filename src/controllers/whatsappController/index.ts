import { Request, Response } from "express";
import { isCloudApiConfigured, getCloudApiConfig } from "../../utils/whatsappCloud";

export const whatsappStatus = async (_req: Request, res: Response) => {
  const configured = isCloudApiConfigured();
  res.json({
    connected: configured,
    mode: configured ? "cloud_api" : "not_configured",
    phoneNumberId: configured ? getCloudApiConfig().phoneNumberId : null,
  });
};
