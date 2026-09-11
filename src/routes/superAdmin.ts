import { Router } from "express";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth";
import {
  listSchools,
  getSchoolDetail,
  createSchool,
  updateSchool,
  deleteSchool,
  listUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  getOverviewAnalytics,
  getTrendAnalytics,
  getSchoolStats,
  getSettings,
  updateSettings,
  approveSchool,
  rejectSchool,
  listSchoolMessages,
  replySchoolMessage,
  listNotifications,
  markNotificationsRead,
  listUserDevices,
} from "../controllers/superAdminController";

const router = Router();

router.use(authenticateToken, requireSuperAdmin());

router.get("/schools", listSchools);
router.post("/schools", createSchool);
router.get("/schools/:id", getSchoolDetail);
router.patch("/schools/:id", updateSchool);
router.delete("/schools/:id", deleteSchool);
router.post("/schools/:id/approve", approveSchool);
router.post("/schools/:id/reject", rejectSchool);
router.get("/schools/:id/messages", listSchoolMessages);
router.post("/schools/:id/messages", replySchoolMessage);

router.get("/users", listUsers);
router.get("/users/:id", getUserDetail);
router.patch("/users/:id", updateUser);
router.post("/users/:id/reset-password", resetUserPassword);
router.get("/users/:id/devices", listUserDevices);

router.get("/analytics/overview", getOverviewAnalytics);
router.get("/analytics/trends", getTrendAnalytics);
router.get("/analytics/schools", getSchoolStats);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

router.get("/notifications", listNotifications);
router.post("/notifications/read", markNotificationsRead);

export default router;