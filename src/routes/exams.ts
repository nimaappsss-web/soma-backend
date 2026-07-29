import { Router } from "express";
import { listExams, createExam, examDetails, updateExam, deleteExam, getExamScores, submitExamScores, getStudentExamScore } from "../controllers/examController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, requireAdmin(), listExams);
router.post("/", authenticateToken, requireAdmin(), createExam);
router.get("/:id", authenticateToken, requireAdmin(), examDetails);
router.patch("/:id", authenticateToken, requireAdmin(), updateExam);
router.delete("/:id", authenticateToken, requireAdmin(), deleteExam);
router.get("/:id/scores", authenticateToken, requireAdmin(), getExamScores);
router.post("/:id/scores", authenticateToken, requireAdmin(), submitExamScores);
router.get("/:id/student/:studentId", authenticateToken, requireAdmin(), getStudentExamScore);

export default router;
