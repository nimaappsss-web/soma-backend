import { Router } from "express";
import { dashboardStats } from "../controllers/dashboardController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/stats", authenticateToken, requireAdmin(), dashboardStats);

export default router;
