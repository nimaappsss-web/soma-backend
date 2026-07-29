import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listFeeStructures = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session } = req.query;

    const where: any = { schoolId: req.user.schoolId };
    if (classId) where.classId = classId;
    if (term) where.term = term;
    if (session) where.session = session;

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ feeStructures: feeStructures.map((f) => ({ ...f, className: f.class.name })) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Fee Structures");
    res.status(errorResponse.status).json(errorResponse);
  }
};
