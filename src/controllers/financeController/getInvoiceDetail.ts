import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

const SIGNATORY_TITLE = "Principal";

export const getInvoiceDetail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const where: any = { id, schoolId: req.user.schoolId };

    if (req.user.role === "PARENT") {
      const studentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);
      where.studentId = { in: studentIds };
    }

    const invoice = await prisma.invoice.findFirst({
      where,
      include: {
        student: { select: { id: true, name: true, admissionNo: true, classId: true } },
        feeStructure: { select: { id: true, name: true, term: true, session: true, items: true } },
        school: {
          select: { name: true, logo: true, address: true, state: true, lga: true, schoolCode: true, principalId: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    let principalName: string | null = null;
    if (invoice.school.principalId) {
      const principal = await prisma.user.findUnique({
        where: { id: invoice.school.principalId },
        select: { name: true },
      });
      principalName = principal?.name ?? null;
    }

    const className = invoice.student.classId
      ? (await prisma.class.findUnique({ where: { id: invoice.student.classId }, select: { name: true } }))?.name ?? null
      : null;

    res.json({
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        items: invoice.items ?? invoice.feeStructure.items ?? [],
        status: invoice.status,
        term: invoice.feeStructure.term,
        session: invoice.feeStructure.session,
        feeName: invoice.feeStructure.name,
        groupId: invoice.feeStructure.id,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
        issuedByName: invoice.issuedByName ?? principalName,
        student: {
          id: invoice.student.id,
          name: invoice.student.name,
          admissionNo: invoice.student.admissionNo,
          className,
        },
        school: {
          name: invoice.school.name,
          logo: invoice.school.logo,
          address: invoice.school.address,
          state: invoice.school.state,
          lga: invoice.school.lga,
          schoolCode: invoice.school.schoolCode,
        },
        signatory: {
          name: invoice.issuedByName ?? principalName,
          title: SIGNATORY_TITLE,
        },
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invoice Detail");
    res.status(errorResponse.status).json(errorResponse);
  }
};