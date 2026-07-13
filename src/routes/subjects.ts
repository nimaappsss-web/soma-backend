import { Router } from "express";
import { listSubjects, createSubject, deleteSubject } from "../controllers/subjectController";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, listSubjects);
router.post("/", authenticateToken, requireAdmin(), createSubject);
router.delete("/:id", authenticateToken, requireAdmin(), deleteSubject);

export default router;
