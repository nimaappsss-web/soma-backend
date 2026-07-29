import { Router } from "express";
import { listSubjects, createSubject, deleteSubject, updateSubject } from "../controllers/subjectController";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, listSubjects);
router.post("/", authenticateToken, requireAdmin(), createSubject);
router.patch("/:id", authenticateToken, requireAdmin(), updateSubject);
router.delete("/:id", authenticateToken, requireAdmin(), deleteSubject);

export default router;
