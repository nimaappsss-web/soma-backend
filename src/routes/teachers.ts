import { Router } from "express";
import { listTeachers, resendInvite, myFormClass, myAssignments, teacherDetails, updateTeacher, teacherStats } from "../controllers/teacherController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/form-class", authenticateToken, myFormClass);
router.get("/assignments", authenticateToken, myAssignments);
router.get("/stats", authenticateToken, requireAdmin(), teacherStats);
router.get("/:id", authenticateToken, requireAdmin(), teacherDetails);
router.get("/", authenticateToken, requireAdmin(), listTeachers);
router.post("/:inviteId/resend-invite", authenticateToken, requireAdmin(), resendInvite);
router.patch("/:id", authenticateToken, requireAdmin(), updateTeacher);

export default router;
