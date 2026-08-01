import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isTermCurrent } from "../../utils/academicTerm";

export const createCalendarTerms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let { term, startDate, endDate } = req.body;

    if (!term || !startDate || !endDate) {
      return res.status(400).json({ error: "term, startDate, and endDate are required" });
    }

    const termMap: Record<string, string> = {
      "1": "1", "1st": "1", "first": "1",
      "2": "2", "2nd": "2", "second": "2",
      "3": "3", "3rd": "3", "third": "3",
    };

    term = termMap[term.toLowerCase()];
    if (!term) {
      return res.status(400).json({ error: "Term must be 1, 2, 3, 1st, 2nd, 3rd, first, second, or third" });
    }

    const existing = await prisma.academicTerm.findUnique({
      where: { schoolId_term: { schoolId: req.user.schoolId, term } },
    });

    if (existing) {
      return res.status(400).json({ error: "Term already exists" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const academicTerm = await prisma.academicTerm.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        term,
        startDate: start,
        endDate: end,
      },
    });

    res.status(201).json({
      term: {
        ...academicTerm,
        isCurrent: isTermCurrent(start, end),
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Calendar Terms");
    res.status(errorResponse.status).json(errorResponse);
  }
};
