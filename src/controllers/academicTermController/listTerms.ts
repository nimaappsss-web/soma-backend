import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listTerms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ session: "desc" }, { term: "asc" }],
      select: {
        id: true,
        term: true,
        session: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    res.json({ terms: terms.map((t) => ({ ...t, term: displayMap[t.term] || t.term })) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Terms");
    res.status(errorResponse.status).json(errorResponse);
  }
};
