import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isTermCurrent } from "../../utils/academicTerm";

export const currentTerm = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: req.user.schoolId },
      select: {
        id: true,
        term: true,
        startDate: true,
        endDate: true,
      },
    });

    const now = new Date();
    const term = terms.find((t) => isTermCurrent(t.startDate, t.endDate));

    if (!term) {
      return res.status(404).json({ error: "No current term set" });
    }

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    res.json({ term: { ...term, term: displayMap[term.term] || term.term, isCurrent: true } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Current Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
