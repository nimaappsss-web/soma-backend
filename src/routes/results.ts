import { Router } from "express";
import {
  termResults,
  broadcastStatus,
  broadcastCa,
  submitExamSheet,
  resendExamResults,
} from "../controllers/examController";
import { authenticateToken } from "../middleware/auth";
import { normalizeTermParam } from "../middleware/normalizeTermParam";

const router = Router();

router.get("/term", authenticateToken, normalizeTermParam, termResults);
router.get("/broadcast/status", authenticateToken, normalizeTermParam, broadcastStatus);
router.post("/broadcast/ca", authenticateToken, normalizeTermParam, broadcastCa);
router.post("/broadcast/exam", authenticateToken, normalizeTermParam, submitExamSheet);
router.post("/broadcast/exam/resend", authenticateToken, normalizeTermParam, resendExamResults);

export default router;
