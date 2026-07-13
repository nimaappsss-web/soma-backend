import { Router } from "express";
import { listParents } from "../controllers/parentController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, requireAdmin(), listParents);

export default router;
