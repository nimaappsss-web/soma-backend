import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getWhatsAppStatus, initWhatsApp, logoutWhatsApp, requestPairingCode } from "../../utils/whatsappClient";

export const whatsappStatus = async (req: AuthRequest, res: Response) => {
  try {
    const status = await getWhatsAppStatus();
    res.json(status);
  } catch (error) {
    const errorResponse = createErrorResponse(error, "WhatsApp Status");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const whatsappConnect = async (req: AuthRequest, res: Response) => {
  try {
    await initWhatsApp();
    const status = await getWhatsAppStatus();
    res.json(status);
  } catch (error) {
    const errorResponse = createErrorResponse(error, "WhatsApp Connect");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const whatsappLogout = async (req: AuthRequest, res: Response) => {
  try {
    await logoutWhatsApp();
    res.json({ message: "WhatsApp disconnected" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "WhatsApp Logout");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const whatsappPairingCode = async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body ?? {};
    if (!phone || !String(phone).replace(/\D/g, "")) {
      res.status(400).json({ message: "phone is required" });
      return;
    }
    const result = await requestPairingCode(String(phone));
    if (!result.ok) {
      res.status(500).json({ message: result.error || "Failed to request pairing code" });
      return;
    }
    res.json({ code: result.code, message: "Enter this code in WhatsApp > Linked Devices > Link a device" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "WhatsApp Pairing Code");
    res.status(errorResponse.status).json(errorResponse);
  }
};