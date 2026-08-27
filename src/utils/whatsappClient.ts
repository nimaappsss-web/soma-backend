export {
  isCloudApiConfigured,
  getCloudApiConfig,
  sendCloudText,
  sendCloudImage,
  sendCloudTemplate,
} from "./whatsappCloud";

import { sendCloudText, sendCloudImage, sendCloudTemplate, isCloudApiConfigured } from "./whatsappCloud";

export const sendWhatsAppMessage = async (
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> => {
  if (!isCloudApiConfigured()) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }
  return sendCloudText(phone, message);
};

export const sendBrandedWhatsAppMessage = async (
  phone: string,
  message: string,
  opts?: { logoUrl?: string; sendLogo?: boolean },
): Promise<{ ok: boolean; error?: string }> => {
  if (!isCloudApiConfigured()) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }
  if (opts?.sendLogo && opts?.logoUrl) {
    return sendCloudImage(phone, opts.logoUrl, message);
  }
  return sendCloudText(phone, message);
};
