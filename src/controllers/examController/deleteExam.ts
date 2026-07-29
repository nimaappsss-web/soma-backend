import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    await prisma.examSession.delete({ where: { id: req.params.id } });

    res.json({ message: "Exam deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Exam");
    res.status(errorResponse.status).json(errorResponse);
  }
};
