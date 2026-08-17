import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

export const listInvoices = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, status, studentId } = req.query;
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
      if (status) where.status = status;
      if (studentId) where.studentId = studentId;
      if (classId) where.student = { classId };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, admissionNo: true } },
          feeStructure: { select: { id: true, name: true, term: true, session: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      invoices: invoices.map((i) => ({
        ...i,
        studentName: i.student.name,
        admissionNo: i.student.admissionNo,
        feeName: i.feeStructure.name,
        term: i.feeStructure.term,
        session: i.feeStructure.session,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Invoices");
    res.status(errorResponse.status).json(errorResponse);
  }
};
