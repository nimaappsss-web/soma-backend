import { Router } from "express";
import { bulkAttendance, listAttendance, studentAttendance } from "../controllers/attendanceController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/bulk", authenticateToken, bulkAttendance);
router.get("/", authenticateToken, listAttendance);
router.get("/student/:id", authenticateToken, studentAttendance);

export default router;
