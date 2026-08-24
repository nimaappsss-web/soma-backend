import { Router } from "express";
import { listTerms, createTerm, updateTerm, deleteTerm, currentTerm, rolloverTerms } from "../controllers/academicTermController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/current", authenticateToken, currentTerm);
router.get("/", authenticateToken, listTerms);
router.post("/", authenticateToken, requireAdmin(), createTerm);
router.post("/rollover", authenticateToken, requireAdmin(), rolloverTerms);
router.patch("/:id", authenticateToken, requireAdmin(), updateTerm);
router.delete("/:id", authenticateToken, requireAdmin(), deleteTerm);

export default router;
