import { Router } from "express";
import { listSubjects, createSubject, deleteSubject } from "../controllers/subjectController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", listSubjects);
router.post("/", authenticateToken, requireRole("PRINCIPAL"), createSubject);
router.delete("/:id", authenticateToken, requireRole("PRINCIPAL"), deleteSubject);

export default router;
