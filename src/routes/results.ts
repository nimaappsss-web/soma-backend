import { Router } from "express";
import { termResults } from "../controllers/examController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/term", authenticateToken, termResults);

export default router;
