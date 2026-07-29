import { Router } from "express";
import { listAnnouncements, createAnnouncement, announcementDetails, updateAnnouncement, deleteAnnouncement } from "../controllers/announcementController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, listAnnouncements);
router.post("/", authenticateToken, requireAdmin(), createAnnouncement);
router.get("/:id", authenticateToken, announcementDetails);
router.patch("/:id", authenticateToken, requireAdmin(), updateAnnouncement);
router.delete("/:id", authenticateToken, requireAdmin(), deleteAnnouncement);

export default router;
