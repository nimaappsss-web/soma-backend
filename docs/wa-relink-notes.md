# WhatsApp Re-link (PAUSED — resume later)

## Status: BLOCKED on re-linking the WhatsApp device
WhatsApp delivery (OTP, payment msgs, all invite links) is coded and working, but the
Baileys device is currently UNLINKED. Re-link required before sends succeed.

## How to re-link
1. Server must be running: `npm run dev` (background, log in `/tmp/soma-backend.log`)
2. Wipe stale session: stop server, `rm -rf .wa-session`, restart server
3. Open `http://localhost:3000/api/whatsapp/link` in a browser and scan the QR with
   WhatsApp → Settings → Linked Devices → Link a Device (QR refreshes ~every 20s)
4. Verify: `curl http://localhost:3000/api/whatsapp/link/status` → `"connected": true`

## Symptoms when broken
- `creds.json` in `.wa-session/` has `registered: false`, `regId: missing`,
  `signalIdentities: 0`
- Log shows repeated `connection errored` / `QR refs attempts ended` /
  `getaddrinfo ENOTFOUND web.whatsapp.com` (the last one was a transient DNS blip)

## Root cause
Session file was corrupt/incomplete (device never finished registering), so WhatsApp
unlinked it. Fix = wipe `.wa-session` + fresh QR (or pairing code via
`POST /api/whatsapp/link/code` with `{"phone":"2349168922373"}` — codes expire ~1 min).

## Sender number
`+2349168922373` (owner ~). Test OTP/msg target: `+2348133946674`.
`WHATSAPP_ENABLED=true` in `.env`.
