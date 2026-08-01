import { Router } from "express";
import { attendanceAnalytics, attendanceAnalyticsCalendar, attendanceSummary, attendanceRange } from "../controllers/analyticsController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/attendance", authenticateToken, requireAdmin(), attendanceAnalytics);
router.get("/attendance/summary", authenticateToken, requireAdmin(), attendanceSummary);
router.get("/attendance/calendar", authenticateToken, requireAdmin(), attendanceAnalyticsCalendar);
router.get("/attendance/range", authenticateToken, requireAdmin(), attendanceRange);

export default router;
