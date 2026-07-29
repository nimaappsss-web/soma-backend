import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentTimeline = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const events = await prisma.studentTimeline.findMany({
      where: { studentId: req.params.id },
      orderBy: { date: "desc" },
      select: { id: true, type: true, description: true, date: true },
    });

    res.json({ studentId: req.params.id, events });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Timeline");
    res.status(errorResponse.status).json(errorResponse);
  }
};
