import { Router } from "express";
import { listStaff, createStaff, staffDetails, updateStaff, deleteStaff, inviteStaff } from "../controllers/staffController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, requireAdmin(), listStaff);
router.post("/", authenticateToken, requireAdmin(), createStaff);
router.post("/invite", authenticateToken, requireAdmin(), inviteStaff);
router.get("/:id", authenticateToken, requireAdmin(), staffDetails);
router.patch("/:id", authenticateToken, requireAdmin(), updateStaff);
router.delete("/:id", authenticateToken, requireAdmin(), deleteStaff);

export default router;
