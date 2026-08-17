import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

export const listPayments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { studentId, invoiceId, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId: req.user.schoolId };

    if (req.user.role === "PARENT") {
      const studentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);
      where.studentId =
        typeof studentId === "string" && studentIds.includes(studentId)
          ? studentId
          : { in: studentIds };
    } else {
      if (studentId) where.studentId = studentId;
      if (invoiceId) where.invoiceId = invoiceId;
      if (status) where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          invoice: { select: { id: true, amount: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments: payments.map((p) => ({
        ...p,
        studentName: p.student.name,
        admissionNo: p.student.admissionNo,
        invoiceAmount: p.invoice.amount,
        invoiceStatus: p.invoice.status,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Payments");
    res.status(errorResponse.status).json(errorResponse);
  }
};
