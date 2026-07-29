import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listCalendarTerms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ session: "desc" }, { term: "asc" }],
      select: { id: true, term: true, session: true, startDate: true, endDate: true, isCurrent: true },
    });

    res.json({ terms });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Calendar Terms");
    res.status(errorResponse.status).json(errorResponse);
  }
};
