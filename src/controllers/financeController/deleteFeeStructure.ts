import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteFeeStructure = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const target = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    await prisma.$transaction([
      prisma.invoice.deleteMany({ where: { feeStructureId: target.id } }),
      prisma.feeStructure.delete({ where: { id: target.id } }),
    ]);

    res.json({ message: "Fee structure deleted", id: target.id });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Fee Structure");
    res.status(errorResponse.status).json(errorResponse);
  }
};