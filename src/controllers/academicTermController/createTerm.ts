import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createTerm = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let { term, session, startDate, endDate } = req.body;

    if (!term || !session || !startDate || !endDate) {
      return res.status(400).json({ error: "Term, session, startDate, and endDate are required" });
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

    const existing = await prisma.academicTerm.findFirst({
      where: { schoolId: req.user.schoolId, term, session },
    });

    if (existing) {
      return res.status(400).json({ error: "This term already exists for this session" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ error: "endDate must be after startDate" });
    }

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    const newTerm = await prisma.academicTerm.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        term,
        session,
        startDate: start,
        endDate: end,
      },
    });

    res.status(201).json({ term: { ...newTerm, term: displayMap[newTerm.term] || newTerm.term } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
