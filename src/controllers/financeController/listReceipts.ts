import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

export const listReceipts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { studentId, term, session } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: req.user.schoolId,
      status: "CONFIRMED",
      receiptNo: { not: null },
    };

    if (req.user.role === "PARENT") {
      const studentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);
      if (studentId && studentIds.includes(studentId as string)) {
        where.studentId = studentId;
      } else {
        where.studentId = { in: studentIds };
      }
    } else {
      if (studentId) where.studentId = studentId;
    }

    let filteredInvoiceIds: string[] | null = null;
    if (term || session) {
      const resolvedSession = session;
      const feeWhere: any = { schoolId: req.user.schoolId };
      if (term) feeWhere.term = term;
      if (resolvedSession) feeWhere.session = resolvedSession;

      const feeStructures = await prisma.feeStructure.findMany({
        where: feeWhere,
        select: { id: true },
      });
      const invoices = await prisma.invoice.findMany({
        where: { schoolId: req.user.schoolId, feeStructureId: { in: feeStructures.map((f) => f.id) } },
        select: { id: true },
      });
      filteredInvoiceIds = invoices.map((i) => i.id);
      if (filteredInvoiceIds.length === 0) {
        return res.json({ receipts: [], total: 0, page, totalPages: 0 });
      }
      where.invoiceId = { in: filteredInvoiceIds };
    }

    const [receipts, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          invoice: {
            select: { id: true, amount: true, status: true, feeStructure: { select: { name: true, term: true, session: true } } },
          },
          school: { select: { id: true, name: true, address: true, schoolCode: true } },
        },
        orderBy: { confirmedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      receipts: receipts.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        studentId: p.studentId,
        studentName: p.student.name,
        admissionNo: p.student.admissionNo,
        invoiceId: p.invoiceId,
        feeName: p.invoice.feeStructure.name,
        term: p.invoice.feeStructure.term,
        session: p.invoice.feeStructure.session,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        submittedAt: p.submittedAt,
        confirmedAt: p.confirmedAt,
        school: p.school,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Receipts");
    res.status(errorResponse.status).json(errorResponse);
  }
};