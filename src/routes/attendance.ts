import { Router } from "express";
import { bulkAttendance, listAttendance, studentAttendance, clearAttendance } from "../controllers/attendanceController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/attendance/bulk:
 *   post:
 *     summary: Create or update attendance records (upsert by studentId + classId + date)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId: { type: string }
 *                     classId: { type: string }
 *                     date: { type: string, format: date }
 *                     status: { type: string, enum: [present, absent, late] }
 *                     remarks: { type: string }
 *     responses:
 *       201:
 *         description: Attendance records saved
 */
router.post("/bulk", authenticateToken, bulkAttendance);

/**
 * @swagger
 * /api/attendance/bulk:
 *   delete:
 *     summary: Delete attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId: { type: string, description: "Filter by class" }
 *               date: { type: string, format: date, description: "Filter by date" }
 *               studentIds: { type: array, items: { type: string }, description: "Filter by specific students" }
 *     responses:
 *       200:
 *         description: Records deleted
 */
router.delete("/bulk", authenticateToken, clearAttendance);

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: List attendance for a class on a date (paginated)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Attendance list
 */
router.get("/", authenticateToken, listAttendance);

/**
 * @swagger
 * /api/attendance/student/{id}:
 *   get:
 *     summary: Get attendance history for a student (paginated)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Student attendance history
 */
router.get("/student/:id", authenticateToken, studentAttendance);

export default router;
