import { Router } from "express";
import { termResults } from "../controllers/examController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/term", authenticateToken, requireAdmin(), termResults);

export default router;
