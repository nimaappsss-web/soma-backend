import { Router } from "express";
import { listTerms, createTerm, updateTerm, setCurrentTerm, deleteTerm, currentTerm } from "../controllers/academicTermController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/current", authenticateToken, currentTerm);
router.get("/", authenticateToken, listTerms);
router.post("/", authenticateToken, requireAdmin(), createTerm);
router.patch("/:id", authenticateToken, requireAdmin(), updateTerm);
router.post("/:id/set-current", authenticateToken, requireAdmin(), setCurrentTerm);
router.delete("/:id", authenticateToken, requireAdmin(), deleteTerm);

export default router;
