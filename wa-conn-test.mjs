import { makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion, DisconnectReason } from "@whiskeysockets/baileys";
const { state, saveCreds } = await useMultiFileAuthState("/tmp/wa-conn-test");
const { version } = await fetchLatestWaWebVersion();
console.log("version:", JSON.stringify(version));
const sock = makeWASocket({ version, auth: state, browser: ["Nima Backend", "Chrome", "1.0"], syncFullHistory: false, markOnlineOnConnect: false });
sock.ev.on("creds.update", saveCreds);
let n = 0;
sock.ev.on("connection.update", (u) => {
  const { connection, lastDisconnect, qr } = u;
  if (qr) { console.log("QR", ++n, qr.slice(0,40)); }
  if (connection === "close") {
    const code = lastDisconnect?.error?.output?.statusCode;
    console.log("close code:", code, lastDisconnect?.error?.message);
    if (code !== 401) { process.exit(0); }
  }
  if (connection === "open") { console.log("OPEN!"); process.exit(0); }
});
setTimeout(()=>{console.log("timeout");process.exit(0)}, 30000);
