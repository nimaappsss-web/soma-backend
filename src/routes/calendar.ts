import { Router } from "express";
import { listEvents, createEvent, eventDetails, updateEvent, deleteEvent, listCalendarTerms, createCalendarTerms } from "../controllers/calendarController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/events", authenticateToken, requireAdmin(), listEvents);
router.post("/events", authenticateToken, requireAdmin(), createEvent);
router.get("/events/:id", authenticateToken, requireAdmin(), eventDetails);
router.patch("/events/:id", authenticateToken, requireAdmin(), updateEvent);
router.delete("/events/:id", authenticateToken, requireAdmin(), deleteEvent);
router.get("/terms", authenticateToken, requireAdmin(), listCalendarTerms);
router.post("/terms", authenticateToken, requireAdmin(), createCalendarTerms);

export default router;
