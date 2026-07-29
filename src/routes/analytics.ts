import { Router } from "express";
import { attendanceAnalytics, attendanceAnalyticsCalendar } from "../controllers/analyticsController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/attendance", authenticateToken, requireAdmin(), attendanceAnalytics);
router.get("/attendance/calendar", authenticateToken, requireAdmin(), attendanceAnalyticsCalendar);

export default router;
