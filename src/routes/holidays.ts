import { Router } from "express";
import { listHolidays, createHoliday, updateHoliday, deleteHoliday } from "../controllers/holidayController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, listHolidays);
router.post("/", authenticateToken, requireAdmin(), createHoliday);
router.put("/:id", authenticateToken, requireAdmin(), updateHoliday);
router.patch("/:id", authenticateToken, requireAdmin(), updateHoliday);
router.delete("/:id", authenticateToken, requireAdmin(), deleteHoliday);

export default router;
