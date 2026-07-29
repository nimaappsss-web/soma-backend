import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { invoiceId, studentId, amount, method, reference } = req.body;

    if (!invoiceId || !studentId || !amount || !method) {
      return res.status(400).json({ error: "invoiceId, studentId, amount, and method are required" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: req.user.schoolId },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const payment = await prisma.payment.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        invoiceId,
        studentId,
        amount,
        method,
        reference: reference || null,
        recordedBy: req.user.userId,
      },
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const paidAmount = totalPaid._sum.amount || 0;
    const newStatus = paidAmount >= invoice.amount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    res.status(201).json({ payment });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Record Payment");
    res.status(errorResponse.status).json(errorResponse);
  }
};
