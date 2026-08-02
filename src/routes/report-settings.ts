import { Router } from "express";
import { getReportSettings, updateReportSettings } from "../controllers/reportController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, getReportSettings);
router.put("/", authenticateToken, requireAdmin(), updateReportSettings);

export default router;
