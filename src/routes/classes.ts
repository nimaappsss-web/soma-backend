import { Router } from "express";
import { listClasses, createClass, deleteClass } from "../controllers/classController";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, listClasses);
router.post("/", authenticateToken, requireAdmin(), createClass);
router.delete("/:id", authenticateToken, requireAdmin(), deleteClass);

export default router;
