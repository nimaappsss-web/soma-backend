import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { studentId, feeStructureId, amount, dueDate } = req.body;

    if (!studentId || !feeStructureId || !amount) {
      return res.status(400).json({ error: "studentId, feeStructureId, and amount are required" });
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id: feeStructureId, schoolId: req.user.schoolId },
      select: { items: true, amount: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        studentId,
        feeStructureId,
        amount,
        items: feeStructure?.items ?? undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ invoice });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Invoice");
    res.status(errorResponse.status).json(errorResponse);
  }
};
