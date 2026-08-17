import { Router } from "express";
import { listFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure, listInvoices, createInvoice, bulkGenerateInvoices, getInvoiceDetail, listPayments, recordPayment, confirmPayment, rejectPayment, listReceipts, sendInvoiceReminders, financeSummary } from "../controllers/financeController";
import { authenticateToken, requireFinance, requireFinanceOrParent, requireRole } from "../middleware/auth";

const router = Router();

router.get("/fee-structures", authenticateToken, requireFinance(), listFeeStructures);
router.post("/fee-structures", authenticateToken, requireFinance(), createFeeStructure);
router.patch("/fee-structures/:id", authenticateToken, requireFinance(), updateFeeStructure);
router.delete("/fee-structures/:id", authenticateToken, requireFinance(), deleteFeeStructure);
router.get("/invoices", authenticateToken, requireFinanceOrParent(), listInvoices);
router.post("/invoices", authenticateToken, requireFinance(), createInvoice);
router.post("/invoices/bulk", authenticateToken, requireFinance(), bulkGenerateInvoices);
router.post("/invoices/reminders", authenticateToken, requireFinance(), sendInvoiceReminders);
router.get("/invoices/:id", authenticateToken, requireFinanceOrParent(), getInvoiceDetail);
router.get("/payments", authenticateToken, requireFinanceOrParent(), listPayments);
router.post("/payments", authenticateToken, requireRole("PRINCIPAL", "SCHOOL_ADMIN", "BURSAR", "PARENT"), recordPayment);
router.patch("/payments/:id/confirm", authenticateToken, requireFinance(), confirmPayment);
router.patch("/payments/:id/reject", authenticateToken, requireFinance(), rejectPayment);
router.get("/receipts", authenticateToken, requireFinanceOrParent(), listReceipts);
router.get("/summary", authenticateToken, requireFinance(), financeSummary);

export default router;