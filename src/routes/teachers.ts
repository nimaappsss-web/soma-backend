import { Router } from "express";
import { listTeachers, resendInvite, myFormClass, myAssignments, teacherDetails } from "../controllers/teacherController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/form-class", authenticateToken, myFormClass);
router.get("/assignments", authenticateToken, myAssignments);
router.get("/:id", authenticateToken, requireRole("PRINCIPAL"), teacherDetails);
router.get("/", authenticateToken, requireRole("PRINCIPAL"), listTeachers);
router.post("/:inviteId/resend-invite", authenticateToken, requireRole("PRINCIPAL"), resendInvite);

export default router;
