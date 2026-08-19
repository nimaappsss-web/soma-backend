import { Router } from "express";
import {
  listExams,
  ensureExamSession,
  createExam,
  examDetails,
  updateExam,
  deleteExam,
  getExamScores,
  submitExamScores,
  submitExamScoresBulk,
  publishExamScores,
  unpublishExamScores,
  submitExamForApproval,
  listExamBroadcasts,
  approveExamBroadcast,
  rejectExamBroadcast,
  getExamScoresBulk,
  deleteExamScoresBulk,
  submitStudentScore,
  getStudentExamScore,
  listScoreComponents,
  createScoreComponent,
  updateScoreComponent,
  deleteScoreComponent,
  deleteScoreScheme,
  updateScoreScheme,
  copyScoreComponents,
  createScoreScheme,
} from "../controllers/examController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// Score scheme components (admin writes; teachers read the scheme)
router.get("/components", authenticateToken, listScoreComponents);
router.post("/components", authenticateToken, requireAdmin(), createScoreComponent);
router.post("/components/copy", authenticateToken, requireAdmin(), copyScoreComponents);
router.patch("/components/:id", authenticateToken, requireAdmin(), updateScoreComponent);
router.delete("/components/:id", authenticateToken, requireAdmin(), deleteScoreComponent);
router.patch("/schemes/:id", authenticateToken, requireAdmin(), updateScoreScheme);
router.delete("/schemes/:id", authenticateToken, requireAdmin(), deleteScoreScheme);
router.post("/schemes", authenticateToken, requireAdmin(), createScoreScheme);

// Assessments (admins full; teachers read + score entry for their assignments)
router.get("/", authenticateToken, listExams);
router.post("/", authenticateToken, requireAdmin(), createExam);
router.post("/ensure", authenticateToken, ensureExamSession);
router.post("/scores", authenticateToken, submitExamScoresBulk);
router.post("/scores/publish", authenticateToken, publishExamScores);
router.post("/scores/unpublish", authenticateToken, unpublishExamScores);
router.post("/scores/submit-for-approval", authenticateToken, submitExamForApproval);
router.get("/scores", authenticateToken, getExamScoresBulk);
router.delete("/scores", authenticateToken, deleteExamScoresBulk);
router.get("/broadcasts", authenticateToken, listExamBroadcasts);
router.post("/broadcasts/:id/approve", authenticateToken, approveExamBroadcast);
router.post("/broadcasts/:id/reject", authenticateToken, rejectExamBroadcast);
router.get("/:id", authenticateToken, examDetails);
router.patch("/:id", authenticateToken, requireAdmin(), updateExam);
router.delete("/:id", authenticateToken, requireAdmin(), deleteExam);
router.get("/:id/scores", authenticateToken, getExamScores);
router.post("/:id/scores", authenticateToken, submitExamScores);
router.get("/:id/student/:studentId", authenticateToken, getStudentExamScore);
router.put("/:id/student/:studentId", authenticateToken, submitStudentScore);

export default router;
