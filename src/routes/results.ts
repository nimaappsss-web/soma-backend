import { Router } from "express";
import {
  termResults,
  broadcastStatus,
  broadcastCa,
  submitExamSheet,
  resendExamResults,
} from "../controllers/examController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/term", authenticateToken, termResults);
router.get("/broadcast/status", authenticateToken, broadcastStatus);
router.post("/broadcast/ca", authenticateToken, broadcastCa);
router.post("/broadcast/exam", authenticateToken, submitExamSheet);
router.post("/broadcast/exam/resend", authenticateToken, resendExamResults);

export default router;
