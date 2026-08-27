const CLOUD_API_VERSION = "v25.0";
const CLOUD_API_BASE = `https://graph.facebook.com/${CLOUD_API_VERSION}`;

export const isCloudApiConfigured = (): boolean => {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
};

export const getCloudApiConfig = () => ({
  token: process.env.WHATSAPP_CLOUD_TOKEN || "",
  phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || "",
});

export const sendCloudText = async (
  to: string,
  message: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { token, phoneNumberId } = getCloudApiConfig();
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }

  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(`${CLOUD_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      const apiMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error(`[whatsapp-cloud] sendCloudText failed: ${apiMsg}`);
      return { ok: false, error: apiMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err: any) {
    console.error(`[whatsapp-cloud] Network error:`, err?.message);
    return { ok: false, error: err?.message || "Cloud API network error" };
  }
};

export const sendCloudImage = async (
  to: string,
  imageUrl: string,
  caption: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { token, phoneNumberId } = getCloudApiConfig();
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }

  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(`${CLOUD_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "image",
        image: { link: imageUrl, caption },
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      const apiMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error(`[whatsapp-cloud] sendCloudImage failed: ${apiMsg}`);
      return { ok: false, error: apiMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err: any) {
    console.error(`[whatsapp-cloud] Network error:`, err?.message);
    return { ok: false, error: err?.message || "Cloud API network error" };
  }
};

export const sendCloudTemplate = async (
  to: string,
  templateName: string,
  languageCode: string,
  parameters: Array<{ type: string; text: string }>,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { token, phoneNumberId } = getCloudApiConfig();
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }

  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(`${CLOUD_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters,
            },
          ],
        },
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      const apiMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error(`[whatsapp-cloud] sendCloudTemplate failed: ${apiMsg}`);
      return { ok: false, error: apiMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err: any) {
    console.error(`[whatsapp-cloud] sendCloudTemplate error:`, err?.message);
    return { ok: false, error: err?.message || "Cloud API network error" };
  }
};
