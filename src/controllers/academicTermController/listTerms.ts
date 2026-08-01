import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isTermCurrent } from "../../utils/academicTerm";

export const listTerms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { term: "asc" },
      select: {
        id: true,
        term: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    res.json({
      terms: terms.map((t) => ({
        ...t,
        term: displayMap[t.term] || t.term,
        isCurrent: isTermCurrent(t.startDate, t.endDate),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Terms");
    res.status(errorResponse.status).json(errorResponse);
  }
};
