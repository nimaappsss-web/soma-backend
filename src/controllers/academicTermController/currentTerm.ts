import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const currentTerm = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const term = await prisma.academicTerm.findFirst({
      where: { schoolId: req.user.schoolId, isCurrent: true },
      select: {
        id: true,
        term: true,
        session: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });

    if (!term) {
      return res.status(404).json({ error: "No current term set" });
    }

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    res.json({ term: { ...term, term: displayMap[term.term] || term.term } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Current Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
