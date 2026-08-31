const TWILIO_API_BASE = (sid: string) =>
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return `whatsapp:${digits}`;
};

export const isCloudApiConfigured = (): boolean => {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
};

export const getCloudApiConfig = () => ({
  token: process.env.TWILIO_AUTH_TOKEN || "",
  phoneNumberId: process.env.TWILIO_ACCOUNT_SID || "",
});

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  from: formatPhone(process.env.TWILIO_WHATSAPP_FROM || ""),
});

const sendTwilioMessage = async (
  to: string,
  body: string,
  mediaUrl?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { accountSid, authToken, from } = getTwilioConfig();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio WhatsApp not configured" };
  }

  const formBody = new URLSearchParams();
  formBody.append("To", formatPhone(to));
  formBody.append("From", from);
  formBody.append("Body", body);
  if (mediaUrl) {
    formBody.append("MediaUrl", mediaUrl);
  }

  try {
    const res = await fetch(TWILIO_API_BASE(accountSid), {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const apiMsg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
        `HTTP ${res.status}`;
      console.error(`[twilio] send failed: ${apiMsg}`);
      return { ok: false, error: apiMsg };
    }

    return { ok: true, messageId: data?.sid };
  } catch (err: any) {
    console.error(`[twilio] Network error:`, err?.message);
    return { ok: false, error: err?.message || "Twilio network error" };
  }
};

export const sendCloudText = async (
  to: string,
  message: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  return sendTwilioMessage(to, message);
};

export const sendCloudImage = async (
  to: string,
  imageUrl: string,
  caption: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  return sendTwilioMessage(to, caption, imageUrl);
};

export const sendCloudTemplate = async (
  to: string,
  templateSid: string,
  _languageCode: string,
  parameters: Array<{ type: string; text: string }>,
): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { accountSid, authToken, from } = getTwilioConfig();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio WhatsApp not configured" };
  }

  const contentVariables: Record<string, string> = {};
  parameters.forEach((param, index) => {
    contentVariables[`${index + 1}`] = param.text;
  });

  const formBody = new URLSearchParams();
  formBody.append("To", formatPhone(to));
  formBody.append("From", from);
  formBody.append("ContentSid", templateSid);
  formBody.append("ContentVariables", JSON.stringify(contentVariables));

  try {
    const res = await fetch(TWILIO_API_BASE(accountSid), {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const apiMsg = data?.message || `HTTP ${res.status}`;
      console.error(`[twilio] template send failed: ${apiMsg}`);
      return { ok: false, error: apiMsg };
    }

    return { ok: true, messageId: data?.sid };
  } catch (err: any) {
    console.error(`[twilio] template send error:`, err?.message);
    return { ok: false, error: err?.message || "Twilio network error" };
  }
};
