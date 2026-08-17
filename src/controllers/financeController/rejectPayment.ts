import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyUser, parentUserIdsForStudents } from "../../utils/notifications";

export const rejectPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const paymentId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "A reason is required to reject a payment" });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, schoolId: req.user.schoolId },
      include: { student: true },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({ error: "Only pending payments can be rejected" });
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REJECTED", rejectedReason: reason.trim() },
    });

    const parentIds = await parentUserIdsForStudents(req.user.schoolId, [payment.studentId]);
    for (const parentId of parentIds) {
      await notifyUser(req.user.schoolId, parentId, {
        title: "Payment not accepted",
        message: `Payment not accepted for ${payment.student.name} — ${reason.trim()}`,
        type: "FEE",
        route: "/parent/fees",
        data: { paymentId: payment.id, invoiceId: payment.invoiceId },
      });
    }

    res.json({ payment: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Reject Payment");
    res.status(errorResponse.status).json(errorResponse);
  }
};