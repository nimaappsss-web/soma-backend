import { Router } from "express";
import { getActiveExamScores } from "../controllers/examController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/active-scores", authenticateToken, getActiveExamScores);

export default router;
