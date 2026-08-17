import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { generateReceiptNo } from "../../utils/receipt";
import { notifyUser, parentUserIdsForStudents } from "../../utils/notifications";

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const paymentId = req.params.id;
    const requestedAmount = Number(req.body.amount);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, schoolId: req.user.schoolId },
      include: { invoice: true, student: true },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({ error: "Only pending payments can be confirmed" });
    }

    const confirmedSum = await prisma.payment.aggregate({
      where: { invoiceId: payment.invoiceId, status: "CONFIRMED" },
      _sum: { amount: true },
    });
    const confirmedTotal = confirmedSum._sum.amount || 0;

    const remaining = payment.invoice.amount - confirmedTotal;

    let confirmedAmount = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : payment.amount;
    const clamped = confirmedAmount > remaining;
    if (clamped) confirmedAmount = Math.max(0, remaining);

    const receiptNo = await generateReceiptNo(req.user.schoolId);

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        amount: clamped ? confirmedAmount : payment.amount,
        receiptNo,
      },
    });

    const newConfirmedTotal = confirmedTotal + confirmedAmount;
    const invoiceStatus = newConfirmedTotal >= payment.invoice.amount ? "PAID" : newConfirmedTotal > 0 ? "PARTIAL" : "UNPAID";

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: invoiceStatus },
    });

    if (invoiceStatus === "PAID") {
      await prisma.payment.updateMany({
        where: { invoiceId: payment.invoiceId, id: { not: paymentId }, status: "PENDING" },
        data: { status: "REJECTED", rejectedReason: "Already paid" },
      });
    }

    const parentIds = await parentUserIdsForStudents(req.user.schoolId, [payment.studentId]);
    for (const parentId of parentIds) {
      await notifyUser(req.user.schoolId, parentId, {
        title: "Payment confirmed",
        message: `Payment confirmed for ${payment.student.name}. Receipt ${receiptNo}.`,
        type: "FEE",
        route: "/parent/fees",
        data: { paymentId: payment.id, invoiceId: payment.invoiceId, receiptNo },
      });
    }

    res.json({
      payment: updated,
      invoiceStatus,
      remainingAfter: Math.max(0, payment.invoice.amount - newConfirmedTotal),
      clamped,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Confirm Payment");
    res.status(errorResponse.status).json(errorResponse);
  }
};