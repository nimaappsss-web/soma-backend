import { Router } from "express";
import { bulkAttendance, listAttendance, studentAttendance, clearAttendance, attendanceSummary, attendanceCalendar, attendanceAvailability, attendanceSummaryByClass, attendanceSummaryByTeacher, attendanceSummaryMyClass } from "../controllers/attendanceController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/summary", authenticateToken, requireAdmin(), attendanceSummary);
router.get("/summary/class/:classId", authenticateToken, requireAdmin(), attendanceSummaryByClass);
router.get("/summary/teacher/:teacherId", authenticateToken, requireAdmin(), attendanceSummaryByTeacher);
router.get("/summary/my-class/:classId", authenticateToken, attendanceSummaryMyClass);
router.get("/availability", authenticateToken, attendanceAvailability);
router.get("/calendar", authenticateToken, attendanceCalendar);
router.post("/bulk", authenticateToken, bulkAttendance);
router.delete("/bulk", authenticateToken, clearAttendance);
router.get("/", authenticateToken, listAttendance);
router.get("/student/:id", authenticateToken, studentAttendance);

export default router;
