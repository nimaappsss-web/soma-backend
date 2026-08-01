import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { isTermCurrent } from "../../utils/academicTerm";

export const updateTerm = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let { term, startDate, endDate } = req.body;

    const termRecord = await prisma.academicTerm.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!termRecord) {
      return res.status(404).json({ error: "Term not found" });
    }

    const termMap: Record<string, string> = {
      "1": "1", "1st": "1", "first": "1",
      "2": "2", "2nd": "2", "second": "2",
      "3": "3", "3rd": "3", "third": "3",
    };

    if (term !== undefined) {
      term = termMap[String(term).toLowerCase()];
      if (!term) {
        return res.status(400).json({ error: "Term must be 1, 2, 3, 1st, 2nd, 3rd, first, second, or third" });
      }
    }

    if (term) {
      const existing = await prisma.academicTerm.findUnique({
        where: { schoolId_term: { schoolId: req.user.schoolId, term } },
      });
      if (existing && existing.id !== req.params.id) {
        return res.status(400).json({ error: "A term with this value already exists" });
      }
    }

    const start = startDate ? new Date(startDate) : termRecord.startDate;
    const end = endDate ? new Date(endDate) : termRecord.endDate;
    if (end <= start) {
      return res.status(400).json({ error: "endDate must be after startDate" });
    }

    const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

    const updated = await prisma.academicTerm.update({
      where: { id: req.params.id },
      data: {
        ...(term ? { term } : {}),
        ...(startDate ? { startDate: start } : {}),
        ...(endDate ? { endDate: end } : {}),
      },
      select: { id: true, term: true, startDate: true, endDate: true, createdAt: true, updatedAt: true },
    });

    res.json({
      term: {
        ...updated,
        term: displayMap[updated.term] || updated.term,
        isCurrent: isTermCurrent(updated.startDate, updated.endDate),
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Term");
    res.status(errorResponse.status).json(errorResponse);
  }
};
