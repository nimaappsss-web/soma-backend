import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const setCurrentTerm = async (req: AuthRequest, res: Response) => {
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

    await prisma.academicTerm.updateMany({
      where: { schoolId: req.user.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    await prisma.academicTerm.update({
      where: { id: req.params.id },
      data: { isCurrent: true },
    });

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ session: "desc" }, { term: "asc" }],
      select: { id: true, term: true, session: true, startDate: true, endDate: true, isCurrent: true },
    });

    res.json({
      message: "Current term updated",
      terms: terms.map((t) => ({ ...t, term: displayMap[t.term] || t.term })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Set Current Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
