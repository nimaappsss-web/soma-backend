import { Router } from "express";
import { listEvents, createEvent, eventDetails, updateEvent, deleteEvent, listCalendarTerms, createCalendarTerms } from "../controllers/calendarController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/events", authenticateToken, listEvents);
router.post("/events", authenticateToken, requireAdmin(), createEvent);
router.get("/events/:id", authenticateToken, eventDetails);
router.patch("/events/:id", authenticateToken, requireAdmin(), updateEvent);
router.delete("/events/:id", authenticateToken, requireAdmin(), deleteEvent);
router.get("/terms", authenticateToken, listCalendarTerms);
router.post("/terms", authenticateToken, requireAdmin(), createCalendarTerms);

export default router;
