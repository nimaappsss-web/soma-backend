import { Router } from "express";
import { generateLessonNote, getCurriculum } from "../controllers/lessonNoteController";
import { authenticateToken, tenantIsolation, optionalAuth } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/lesson-notes/curriculum:
 *   get:
 *     summary: Get curriculum subjects and topics for a class
 *     tags: [Lesson Notes]
 *     parameters:
 *       - in: query
 *         name: className
 *         required: true
 *         schema: { type: string }
 *         description: e.g. "Pry 3", "JSS 1"
 *       - in: query
 *         name: subjectName
 *         schema: { type: string }
 *         description: If provided, returns week-by-week topics for that subject
 *     responses:
 *       200:
 *         description: Curriculum data
 */
router.get("/curriculum", optionalAuth, getCurriculum);

/**
 * @swagger
 * /api/lesson-notes/generate:
 *   post:
 *     summary: Generate a lesson note using AI (Groq)
 *     tags: [Lesson Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjectName, className]
 *             properties:
 *               subjectName:
 *                 type: string
 *                 description: e.g. "Mathematics"
 *               className:
 *                 type: string
 *                 description: e.g. "Pry 3"
 *               week:
 *                 type: integer
 *                 default: 1
 *               term:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Generated lesson note with sections
 */
router.post("/generate", authenticateToken, tenantIsolation, generateLessonNote);

export default router;
