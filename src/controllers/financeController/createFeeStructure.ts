import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createFeeStructure = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, name, amount, isCompulsory } = req.body;

    if (!classId || !term || !session || !name || amount === undefined) {
      return res.status(400).json({ error: "classId, term, session, name, and amount are required" });
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        classId,
        term,
        session,
        name,
        amount,
        isCompulsory: isCompulsory !== false,
      },
      include: { class: { select: { id: true, name: true } } },
    });

    res.status(201).json({ feeStructure: { ...feeStructure, className: feeStructure.class.name } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Fee Structure");
    res.status(errorResponse.status).json(errorResponse);
  }
};
