import path from "path";

type ConnectionStatus = "disconnected" | "connecting" | "open" | "reconnecting" | "loggedOut";

let socket: any = null;
let socketInitPromise: Promise<any> | null = null;
let status: ConnectionStatus = "disconnected";
let lastQr: string | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const SESSION_DIR = path.join(process.cwd(), ".wa-session");

export type WhatsAppStatus = {
  connected: boolean;
  status: ConnectionStatus;
  hasSession: boolean;
  phone?: string | null;
  qr?: string | null;
  qrDataUrl?: string | null;
};

const getHasSession = async () => {
  try {
    const fs = await import("fs");
    return fs.existsSync(path.join(SESSION_DIR, "creds.json"));
  } catch {
    return false;
  }
};

const loadBaileys = () => import("@whiskeysockets/baileys");

const startSocket = async () => {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } =
    await loadBaileys();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestWaWebVersion();

  status = "connecting";

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Nima Backend", "Chrome", "1.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQr = qr;
      status = "connecting";
      import("qrcode").then((QRCode) => {
        QRCode.toString(qr, { type: "terminal", small: true }).then((out) => {
          console.log("[whatsapp] Scan this QR with your WhatsApp to link the sender number:\n" + out);
        }).catch(() => {});
      });
    }

    if (connection === "open") {
      status = "open";
      lastQr = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        status = "loggedOut";
        socket = null;
        socketInitPromise = null;
      } else {
        status = "reconnecting";
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          socketInitPromise = null;
          initWhatsApp();
        }, 3000);
      }
    }
  });

  return sock;
};

export const initWhatsApp = async () => {
  if (socket && status === "open") return socket;
  if (socketInitPromise) return socketInitPromise;

  socketInitPromise = startSocket()
    .catch(async (err: any) => {
      console.error("[whatsapp] Failed to initialize:", err?.message || err);
      socketInitPromise = null;
      status = "disconnected";
      return null;
    });

  return socketInitPromise;
};

export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  const hasSession = await getHasSession();

  let phone: string | null = null;
  if (hasSession) {
    try {
      const fs = await import("fs");
      const creds = JSON.parse(
        fs.readFileSync(path.join(SESSION_DIR, "creds.json"), "utf-8"),
      );
      phone = creds?.me?.id?.split(":")?.[0] || null;
    } catch {
      phone = null;
    }
  }

  const qrValue = status === "connecting" && lastQr ? lastQr : null;

  let qrDataUrl: string | null = null;
  if (qrValue) {
    try {
      const QRCode = await import("qrcode");
      qrDataUrl = await QRCode.toDataURL(qrValue, { width: 300, margin: 2 });
    } catch {
      qrDataUrl = null;
    }
  }

  return {
    connected: status === "open",
    status,
    hasSession,
    phone,
    qr: qrValue,
    qrDataUrl,
  };
};

export const sendWhatsAppMessage = async (
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const sock = await initWhatsApp();
    if (!sock || status !== "open") {
      return { ok: false, error: `WhatsApp not connected (status: ${status})` };
    }

    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown WhatsApp error" };
  }
};

export const sendBrandedWhatsAppMessage = async (
  phone: string,
  message: string,
  opts?: { logoUrl?: string; sendLogo?: boolean },
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const sock = await initWhatsApp();
    if (!sock || status !== "open") {
      return { ok: false, error: `WhatsApp not connected (status: ${status})` };
    }

    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    const logoUrl = opts?.logoUrl;

    if (opts?.sendLogo && logoUrl) {
      const isLocalPath = logoUrl.startsWith("/") || logoUrl.startsWith("file://");
      let image: any;
      if (isLocalPath) {
        const fs = await import("fs");
        const filePath = logoUrl.replace(/^file:\/\//, "");
        image = fs.readFileSync(filePath);
      } else {
        image = { url: logoUrl };
      }
      await sock.sendMessage(jid, {
        image,
        caption: message,
      });
    } else {
      await sock.sendMessage(jid, { text: message });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown WhatsApp error" };
  }
};

export const requestPairingCode = async (
  phone: string,
): Promise<{ ok: boolean; code?: string; error?: string }> => {
  try {
    let sock = socket;
    if (!sock || status === "disconnected" || status === "loggedOut") {
      sock = await initWhatsApp();
    }
    if (!sock) {
      return { ok: false, error: `WhatsApp socket unavailable (status: ${status})` };
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const code = await sock.requestPairingCode(phone.replace(/\D/g, ""));
    return { ok: true, code };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown WhatsApp error" };
  }
};

export const logoutWhatsApp = async () => {
  try {
    if (socket) {
      socket?.logout?.();
    }
    const fs = await import("fs");
    const rm = await import("fs/promises");
    if (fs.existsSync(SESSION_DIR)) {
      await rm.rm(SESSION_DIR, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }
  socket = null;
  socketInitPromise = null;
  status = "disconnected";
  lastQr = null;
};