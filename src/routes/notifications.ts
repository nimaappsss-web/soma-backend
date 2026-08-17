import { Router } from "express";
import {
  listNotifications,
  notificationStream,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, listNotifications);
router.get("/stream", notificationStream);
router.post("/read-all", authenticateToken, markAllNotificationsRead);
router.patch("/:id/read", authenticateToken, markNotificationRead);

export default router;