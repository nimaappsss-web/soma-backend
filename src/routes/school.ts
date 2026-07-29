import { Router } from "express";
import { getSchool, updateSchool, getSettings, seedClasses } from "../controllers/schoolController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, getSchool);
router.patch("/", authenticateToken, requireAdmin(), updateSchool);
router.get("/settings", authenticateToken, getSettings);
router.post("/seed-classes", authenticateToken, requireAdmin(), seedClasses);

export default router;
