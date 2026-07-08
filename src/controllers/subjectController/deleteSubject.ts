import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await prisma.subject.delete({ where: { id } });

    res.json({ message: "Subject deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Subject");
    res.status(errorResponse.status).json(errorResponse);
  }
};
