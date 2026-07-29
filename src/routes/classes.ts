import { Router } from "express";
import { listClasses, createClass, deleteClass, classDetails, updateClass } from "../controllers/classController";
import { authenticateToken, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, listClasses);
router.post("/", authenticateToken, requireAdmin(), createClass);
router.get("/:id", authenticateToken, classDetails);
router.patch("/:id", authenticateToken, requireAdmin(), updateClass);
router.delete("/:id", authenticateToken, requireAdmin(), deleteClass);

export default router;
