import { Router } from "express";
import { listParents, parentStats, inviteParent, resendParentInviteController } from "../controllers/parentController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/stats", authenticateToken, requireAdmin(), parentStats);
router.post("/invite", authenticateToken, requireAdmin(), inviteParent);
router.post("/:id/resend-invite", authenticateToken, requireAdmin(), resendParentInviteController);
router.get("/", authenticateToken, requireAdmin(), listParents);

export default router;
