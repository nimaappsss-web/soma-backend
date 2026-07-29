import { Router } from "express";
import { listReports, generateReport, reportDetails, availableReports, downloadReport, reportHistory } from "../controllers/reportController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/available", authenticateToken, requireAdmin(), availableReports);
router.get("/history", authenticateToken, requireAdmin(), reportHistory);
router.get("/", authenticateToken, requireAdmin(), listReports);
router.post("/generate", authenticateToken, requireAdmin(), generateReport);
router.get("/:id/download", authenticateToken, requireAdmin(), downloadReport);
router.get("/:id", authenticateToken, requireAdmin(), reportDetails);

export default router;
