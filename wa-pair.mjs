import { makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion, DisconnectReason } from "@whiskeysockets/baileys";

const dir = "/tmp/wa-pair-session";
const { state, saveCreds } = await useMultiFileAuthState(dir);
const { version } = await fetchLatestWaWebVersion();
console.log("REAL version:", JSON.stringify(version));

const sock = makeWASocket({
  version,
  auth: state,
  browser: ["Nima Backend", "Chrome", "1.0"],
  syncFullHistory: false,
  markOnlineOnConnect: false,
});
sock.ev.on("creds.update", saveCreds);

const PHONE = "2349168922373";
let pairingDone = false;

sock.ev.on("connection.update", async (u) => {
  const { connection, lastDisconnect, qr } = u;
  if (qr && !pairingDone) {
    console.log(">>> QR generated (pairing code will be requested)");
  }
  if (connection === "close") {
    console.log(">>> close:", lastDisconnect?.error?.output?.statusCode, lastDisconnect?.error?.message);
  }
});

// Wait a moment for socket to be ready, then request pairing code
setTimeout(async () => {
  if (pairingDone) return;
  pairingDone = true;
  try {
    const code = await sock.requestPairingCode(PHONE);
    console.log(">>> PAIRING CODE:", code);
    console.log(">>> Enter this in WhatsApp > Settings > Linked Devices > Link a device > Link with phone number instead");
  } catch (e) {
    console.log(">>> pairing code error:", e?.message);
  }
  setTimeout(() => process.exit(0), 30000);
}, 4000);

setTimeout(() => { console.log(">>> TIMEOUT"); process.exit(0); }, 60000);
