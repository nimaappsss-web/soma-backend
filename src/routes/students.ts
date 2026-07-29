import { Router } from "express";
import { createStudent, bulkCreateStudents, listStudents, studentDetails, updateStudent, generateAdmission, reserveBatch, resendParentInvite, studentStats, studentTimeline, studentMonthlyAttendance, studentAcademics } from "../controllers/studentController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { createStudentLimiter, bulkCreateStudentLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/stats", authenticateToken, requireAdmin(), studentStats);
router.post("/bulk", authenticateToken, requireAdmin(), bulkCreateStudentLimiter, bulkCreateStudents);
router.post("/reserve-batch", authenticateToken, requireAdmin(), reserveBatch);
router.post("/resend-parent-invite/:inviteId", authenticateToken, requireAdmin(), resendParentInvite);
router.get("/generate-admission", authenticateToken, generateAdmission);
router.get("/", authenticateToken, listStudents);
router.get("/:id", authenticateToken, studentDetails);
router.get("/:id/timeline", authenticateToken, studentTimeline);
router.get("/:id/academics", authenticateToken, studentAcademics);
router.get("/:id/attendance/monthly", authenticateToken, studentMonthlyAttendance);
router.post("/", authenticateToken, requireAdmin(), createStudentLimiter, createStudent);
router.patch("/:id", authenticateToken, requireAdmin(), updateStudent);

export default router;
