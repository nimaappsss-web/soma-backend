import { Router } from "express";
import { listTimetable, createTimetable, updateTimetable, deleteTimetable, bulkCreateTimetable, teacherTimetable } from "../controllers/timetableController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/teacher/:teacherId", authenticateToken, requireAdmin(), teacherTimetable);
router.post("/bulk", authenticateToken, requireAdmin(), bulkCreateTimetable);
router.get("/", authenticateToken, requireAdmin(), listTimetable);
router.post("/", authenticateToken, requireAdmin(), createTimetable);
router.put("/:id", authenticateToken, requireAdmin(), updateTimetable);
router.delete("/:id", authenticateToken, requireAdmin(), deleteTimetable);

export default router;
