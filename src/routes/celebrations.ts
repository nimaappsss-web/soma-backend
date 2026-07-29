import { Router } from "express";
import { listCelebrations } from "../controllers/celebrationController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, requireAdmin(), listCelebrations);

export default router;
