import { Router } from "express";
import { getSchool, updateSchool, updateSchoolTypes, getSettings, seedClasses } from "../controllers/schoolController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, getSchool);
router.patch("/", authenticateToken, requireAdmin(), updateSchool);
router.get("/settings", authenticateToken, getSettings);
router.post("/seed-classes", authenticateToken, requireAdmin(), seedClasses);
router.patch("/school-types", authenticateToken, requireAdmin(), updateSchoolTypes);

export default router;
