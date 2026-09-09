import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { createMessage, listMessages } from "../controllers/supportMessageController";

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/support-messages — send a message to the platform team.
 * GET /api/support-messages — list this school's support thread.
 */
router.post("/", createMessage);
router.get("/", listMessages);

export default router;