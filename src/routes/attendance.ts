import { Router } from "express";
import { bulkAttendance, listAttendance, studentAttendance, clearAttendance } from "../controllers/attendanceController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/bulk", authenticateToken, bulkAttendance);
router.delete("/bulk", authenticateToken, clearAttendance);
router.get("/", authenticateToken, listAttendance);
router.get("/student/:id", authenticateToken, studentAttendance);

export default router;
