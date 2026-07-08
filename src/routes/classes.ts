import { Router } from "express";
import { listClasses, createClass, deleteClass } from "../controllers/classController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", listClasses);
router.post("/", authenticateToken, requireRole("PRINCIPAL"), createClass);
router.delete("/:id", authenticateToken, requireRole("PRINCIPAL"), deleteClass);

export default router;
