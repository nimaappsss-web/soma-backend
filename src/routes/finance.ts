import { Router } from "express";
import { listFeeStructures, createFeeStructure, listInvoices, createInvoice, listPayments, recordPayment, financeSummary } from "../controllers/financeController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/fee-structures", authenticateToken, requireAdmin(), listFeeStructures);
router.post("/fee-structures", authenticateToken, requireAdmin(), createFeeStructure);
router.get("/invoices", authenticateToken, requireAdmin(), listInvoices);
router.post("/invoices", authenticateToken, requireAdmin(), createInvoice);
router.get("/payments", authenticateToken, requireAdmin(), listPayments);
router.post("/payments", authenticateToken, requireAdmin(), recordPayment);
router.get("/summary", authenticateToken, requireAdmin(), financeSummary);

export default router;
