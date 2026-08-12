import { Router } from "express";
import { listTimetable, createTimetable, updateTimetable, deleteTimetable, bulkCreateTimetable, teacherTimetable } from "../controllers/timetableController";
import { publishTimetable } from "../controllers/timetableController/publishTimetable";
import { getTimetableBuild } from "../controllers/timetableController/getTimetableBuild";
import {
  deleteTimetableConfig,
  listTimetableConfigs,
  upsertTimetableConfig,
} from "../controllers/timetableConfigController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/configs", authenticateToken, requireAdmin(), listTimetableConfigs);
router.post("/configs", authenticateToken, requireAdmin(), upsertTimetableConfig);
router.put("/configs/:configType", authenticateToken, requireAdmin(), upsertTimetableConfig);
router.delete("/configs/:configType", authenticateToken, requireAdmin(), deleteTimetableConfig);
router.get("/teacher/:teacherId", authenticateToken, teacherTimetable);
router.post("/publish", authenticateToken, requireAdmin(), publishTimetable);
router.get("/build/:classId", authenticateToken, requireAdmin(), getTimetableBuild);
router.post("/bulk", authenticateToken, requireAdmin(), bulkCreateTimetable);
router.get("/", authenticateToken, requireAdmin(), listTimetable);
router.post("/", authenticateToken, requireAdmin(), createTimetable);
router.put("/:id", authenticateToken, requireAdmin(), updateTimetable);
router.delete("/:id", authenticateToken, requireAdmin(), deleteTimetable);

export default router;
