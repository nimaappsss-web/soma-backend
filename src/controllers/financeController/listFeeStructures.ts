import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";

export const listFeeStructures = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session } = req.query;

    const where: any = { schoolId: req.user.schoolId };
    if (classId) where.classIds = { array_contains: [classId] };
    if (term) where.term = term;
    if (session) where.session = session;
    if (term && !session) {
      where.session = await resolveSession(req.user.schoolId, term as string);
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const classIds = Array.from(new Set(feeStructures.flatMap((f) => (f.classIds as string[]) ?? [])));
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    res.json({
      feeStructures: feeStructures.map((f) => ({
        ...f,
        classIds: (f.classIds as string[]) ?? [],
        classNames: ((f.classIds as string[]) ?? []).map((cid) => classMap[cid] ?? "Unknown"),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Fee Structures");
    res.status(errorResponse.status).json(errorResponse);
  }
};