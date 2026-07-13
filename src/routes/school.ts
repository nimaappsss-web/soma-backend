import { Router } from "express";
import { getSchool, updateSchool } from "../controllers/schoolController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, getSchool);
router.patch("/", authenticateToken, requireAdmin(), updateSchool);

export default router;
