import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyMany, parentUserIdsForStudents } from "../../utils/notifications";

export const sendInvoiceReminders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { invoiceIds, studentId } = req.body;

    const where: any = {
      schoolId: req.user.schoolId,
      status: { in: ["UNPAID", "PARTIAL"] },
    };
    if (Array.isArray(invoiceIds) && invoiceIds.length > 0) where.id = { in: invoiceIds };
    if (studentId) where.studentId = studentId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        feeStructure: { select: { name: true, term: true, session: true } },
      },
    });

    if (invoices.length === 0) {
      return res.json({ sent: 0, message: "No outstanding invoices to remind" });
    }

    const studentIds = [...new Set(invoices.map((i) => i.studentId))];
    const parentIds = await parentUserIdsForStudents(req.user.schoolId, studentIds);

    if (parentIds.length > 0) {
      await notifyMany(req.user.schoolId, parentIds, {
        title: "Fee payment reminder",
        message: `You have ${invoices.length} outstanding school fee${invoices.length === 1 ? "" : "s"} for your child. Please complete payment.`,
        type: "FEE",
        route: "/parent/fees",
        data: { invoiceIds: invoices.map((i) => i.id), studentIds },
      });
    }

    res.json({ sent: parentIds.length, invoices: invoices.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Send Invoice Reminders");
    res.status(errorResponse.status).json(errorResponse);
  }
};