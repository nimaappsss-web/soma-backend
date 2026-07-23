import { Router } from "express";
import { getSchool, updateSchool, getSettings } from "../controllers/schoolController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, getSchool);
router.patch("/", authenticateToken, requireAdmin(), updateSchool);
router.get("/settings", authenticateToken, getSettings);

export default router;
