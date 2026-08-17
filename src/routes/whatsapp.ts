import { Router } from "express";
import path from "path";
import { whatsappStatus, whatsappConnect, whatsappLogout, whatsappPairingCode } from "../controllers/whatsappController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { requestPairingCode } from "../utils/whatsappClient";

const router = Router();

router.get("/link", async (_req, res) => {
  const page = path.join(process.cwd(), "src", "wa-link.html");
  res.sendFile(page);
});

router.post("/link/code", async (req, res) => {
  try {
    const { phone } = req.body ?? {};
    const result = await requestPairingCode(String(phone ?? "2349168922373").replace(/\D/g, "") || "2349168922373");
    if (!result.ok) {
      res.status(500).json({ message: result.error || "Failed" });
      return;
    }
    res.json({ code: result.code });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed" });
  }
});

router.get("/link/status", async (_req, res) => {
  try {
    const { getWhatsAppStatus } = await import("../utils/whatsappClient");
    const status = await getWhatsAppStatus();
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed" });
  }
});

router.get("/status", authenticateToken, requireAdmin(), whatsappStatus);
router.post("/connect", authenticateToken, requireAdmin(), whatsappConnect);
router.post("/logout", authenticateToken, requireAdmin(), whatsappLogout);
router.post("/pairing-code", authenticateToken, requireAdmin(), whatsappPairingCode);

export default router;