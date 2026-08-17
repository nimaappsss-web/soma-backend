import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { Prisma } from "../../generated/prisma/client";
import { generateInvoicesForFeeStructure } from "./generateInvoicesForFeeStructure";

interface FeeItemInput {
  id?: string;
  label: string;
  amount: number;
}

const sumItems = (items: FeeItemInput[]): number =>
  items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

export const createFeeStructure = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const { classIds, term, session, name, isCompulsory } = req.body;
    const items: FeeItemInput[] = Array.isArray(req.body.items) ? req.body.items : [];

    const ids = Array.isArray(classIds) ? classIds : classIds ? [classIds] : [];

    if (ids.length === 0 || !term || !name) {
      return res.status(400).json({ error: "classIds, term, and name are required" });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: "At least one fee item is required" });
    }

    if (items.some((it) => !it.label || !(Number(it.amount) > 0))) {
      return res.status(400).json({ error: "Every fee item needs a label and a positive amount" });
    }

    const resolvedSession = await resolveSession(schoolId, term, session);

    const existingClasses = await prisma.class.findMany({
      where: { schoolId: schoolId, id: { in: ids } },
      select: { id: true, name: true },
    });

    if (existingClasses.length !== ids.length) {
      return res.status(400).json({ error: "One or more classes do not exist in this school" });
    }

    const duplicates = await prisma.feeStructure.findMany({
      where: {
        schoolId: schoolId,
        term,
        session: resolvedSession,
      },
      select: { classIds: true },
    });

    const covered = new Set<string>();
    for (const row of duplicates) {
      const rowClassIds = (row.classIds as string[]) ?? [];
      for (const cid of rowClassIds) covered.add(cid);
    }
    const already = ids.filter((cid) => covered.has(cid));

    if (already.length > 0) {
      return res.status(409).json({
        error: `A fee structure already exists for: ${already.map((cid) => existingClasses.find((c) => c.id === cid)?.name ?? "a selected class").join(", ")}`,
      });
    }

    const total = sumItems(items);

    const created = await prisma.feeStructure.create({
      data: {
        schoolId: schoolId,
        classIds: ids as unknown as Prisma.InputJsonValue,
        term,
        session: resolvedSession,
        name,
        amount: total,
        items: items as unknown as Prisma.InputJsonValue,
        isCompulsory: isCompulsory !== false,
      },
    });

    const classMap = Object.fromEntries(existingClasses.map((c) => [c.id, c.name]));

    let issuedByName: string | null = null;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { principalId: true },
    });
    if (school?.principalId) {
      const principal = await prisma.user.findUnique({
        where: { id: school.principalId },
        select: { name: true },
      });
      issuedByName = principal?.name ?? null;
    }

    const invoicesGenerated = await generateInvoicesForFeeStructure({
      schoolId,
      feeStructure: {
        id: created.id,
        classIds: (created.classIds as string[]) ?? [],
        amount: created.amount,
        items: (created.items as Prisma.InputJsonValue | null) ?? undefined,
      },
      issuedByName,
    });

    res.status(201).json({
      feeStructure: {
        ...created,
        classNames: ids.map((cid) => classMap[cid] ?? "Unknown"),
      },
      invoicesGenerated,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Fee Structure");
    res.status(errorResponse.status).json(errorResponse);
  }
};