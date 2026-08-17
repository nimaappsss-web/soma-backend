import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { generateReceiptNo } from "../../utils/receipt";
import { notifyMany, notifyUser, parentUserIdsForStudents } from "../../utils/notifications";
import { studentIdsForParent } from "../../utils/parentScoping";

export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { invoiceId, studentId, amount, method, reference, status, submittedAt } = req.body;

    if (!invoiceId || !studentId || !amount || !method) {
      return res.status(400).json({ error: "invoiceId, studentId, amount, and method are required" });
    }

    const isParent = req.user.role === "PARENT";

    // Parents can only submit PENDING payments for their own children.
    if (isParent) {
      const ownStudentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);
      if (!ownStudentIds.includes(studentId)) {
        return res.status(403).json({ error: "You can only submit payments for your own children" });
      }
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: req.user.schoolId },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.studentId !== studentId) {
      return res.status(400).json({ error: "Invoice does not match this student" });
    }

    const requestedStatus: "PENDING" | "CONFIRMED" = status === "PENDING" ? "PENDING" : "CONFIRMED";
    const finalStatus = isParent ? "PENDING" : requestedStatus;

    if (reference) {
      const existing = await prisma.payment.findFirst({
        where: { schoolId: req.user.schoolId, reference },
      });
      if (existing) {
        return res.status(409).json({ error: "This transaction reference has already been used" });
      }
    }

    let receiptNo: string | null = null;
    let finalAmount = Number(amount);

    if (finalStatus === "CONFIRMED") {
      const confirmedSum = await prisma.payment.aggregate({
        where: { invoiceId, status: "CONFIRMED" },
        _sum: { amount: true },
      });
      const remaining = invoice.amount - (confirmedSum._sum.amount || 0);
      if (finalAmount > remaining) finalAmount = Math.max(0, remaining);
      receiptNo = await generateReceiptNo(req.user.schoolId);
    }

    const payment = await prisma.payment.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        invoiceId,
        studentId,
        amount: finalAmount,
        method,
        reference: reference || null,
        recordedBy: req.user.userId,
        status: finalStatus,
        submittedAt: submittedAt ? new Date(submittedAt) : finalStatus === "PENDING" ? new Date() : null,
        confirmedAt: finalStatus === "CONFIRMED" ? new Date() : null,
        receiptNo,
      },
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { invoiceId, status: "CONFIRMED" },
      _sum: { amount: true },
    });

    const paidAmount = totalPaid._sum.amount || 0;
    const newStatus = paidAmount >= invoice.amount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    const studentName = student?.name || "student";

    if (finalStatus === "PENDING") {
      const [financeUsers, submitter] = await Promise.all([
        prisma.user.findMany({
          where: { schoolId: req.user.schoolId, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN", "BURSAR"] }, active: true },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { name: true },
        }),
      ]);
      const submitterName = submitter?.name || "A parent";
      await notifyMany(
        req.user.schoolId,
        financeUsers.map((u) => u.id),
        {
          title: "Payment submitted",
          message: `${submitterName} submitted ₦${finalAmount.toLocaleString()} for ${studentName}.`,
          type: "FEE",
          route: "/admin/finance/pending",
          data: { paymentId: payment.id, invoiceId },
        },
      );
    } else {
      const parentIds = await parentUserIdsForStudents(req.user.schoolId, [studentId]);
      for (const parentId of parentIds) {
        await notifyUser(req.user.schoolId, parentId, {
          title: "Payment confirmed",
          message: `Payment confirmed for ${studentName}. Receipt ${receiptNo}.`,
          type: "FEE",
          route: "/parent/fees",
          data: { paymentId: payment.id, invoiceId, receiptNo },
        });
      }
    }

    res.status(201).json({ payment });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Record Payment");
    res.status(errorResponse.status).json(errorResponse);
  }
};