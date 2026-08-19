import { Router } from "express";
import { listParents, parentMe, parentStats, inviteParent, resendParentInviteController, parentAttendance, parentExamResults } from "../controllers/parentController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/me", authenticateToken, parentMe);
router.get("/me/attendance", authenticateToken, parentAttendance);
router.get("/me/exam-results", authenticateToken, parentExamResults);
router.get("/stats", authenticateToken, requireAdmin(), parentStats);
router.post("/invite", authenticateToken, requireAdmin(), inviteParent);
router.post("/:id/resend-invite", authenticateToken, requireAdmin(), resendParentInviteController);
router.get("/", authenticateToken, requireAdmin(), listParents);

export default router;
