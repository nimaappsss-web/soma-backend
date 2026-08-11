import { Router } from "express";
import {
  listClassSubjects,
  saveClassSubjects,
} from "../controllers/classSubjectController";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, listClassSubjects);
router.put("/", authenticateToken, requireAdmin(), saveClassSubjects);

export default router;
