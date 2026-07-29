import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteTerm = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const termRecord = await prisma.academicTerm.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!termRecord) {
      return res.status(404).json({ error: "Term not found" });
    }

    await prisma.academicTerm.delete({ where: { id: req.params.id } });

    res.json({ message: "Term removed" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
