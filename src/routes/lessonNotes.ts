import { Router } from "express";
import { generateLessonNote, getCurriculum } from "../controllers/lessonNoteController";
import { authenticateToken, tenantIsolation, optionalAuth } from "../middleware/auth";

const router = Router();

router.get("/curriculum", optionalAuth, getCurriculum);
router.post("/generate", authenticateToken, tenantIsolation, generateLessonNote);

export default router;
