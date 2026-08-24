import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { normalizeTerm, isTermCurrent } from "../../utils/academicTerm";

const displayMap: Record<string, string> = { "1": "first", "2": "second", "3": "third" };

/**
 * Session rollover: update the dates of all three terms for the new session in
 * one atomic call. Whichever term's range contains today becomes current
 * automatically (isCurrent is derived from dates), so a rollover that sets
 * First Term to span today effectively resets the active term to First.
 *
 * Body: { terms: [{ term: "first" | "second" | "third", startDate, endDate }, ...] }
 */
export const rolloverTerms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const incoming = req.body?.terms;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: "terms must be a non-empty array" });
    }

    // Normalize + validate each row before writing anything.
    const updates = incoming.map(({ term, startDate, endDate }) => {
      const normalized = normalizeTerm(String(term ?? ""));
      if (!normalized) {
        throw Object.assign(new Error("Each term must be first/second/third"), { status: 400 });
      }
      if (!startDate || !endDate || isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        throw Object.assign(new Error(`Invalid dates for ${displayMap[normalized]} term`), { status: 400 });
      }
      if (new Date(endDate) <= new Date(startDate)) {
        throw Object.assign(
          new Error(`${displayMap[normalized]} term end date must be after its start date`),
          { status: 400 },
        );
      }
      return { term: normalized, startDate: new Date(startDate), endDate: new Date(endDate) };
    });

    const existing = await prisma.academicTerm.findMany({ where: { schoolId } });
    const existingByTerm = new Map(existing.map((t) => [t.term, t]));

    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        if (existingByTerm.has(u.term)) {
          await tx.academicTerm.update({
            where: { schoolId_term: { schoolId, term: u.term } },
            data: { startDate: u.startDate, endDate: u.endDate },
          });
        } else {
          await tx.academicTerm.create({
            data: { schoolId, term: u.term, startDate: u.startDate, endDate: u.endDate },
          });
        }
      }
    });

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId },
      orderBy: { term: "asc" },
      select: { id: true, term: true, startDate: true, endDate: true },
    });

    res.json({
      terms: terms.map((t) => ({
        ...t,
        term: displayMap[t.term] || t.term,
        isCurrent: isTermCurrent(t.startDate, t.endDate),
      })),
    });
  } catch (error: any) {
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    const errorResponse = createErrorResponse(error, "Rollover Terms");
    res.status(errorResponse.status).json(errorResponse);
  }
};
