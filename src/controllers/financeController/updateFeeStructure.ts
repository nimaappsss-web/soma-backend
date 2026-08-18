import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { Prisma } from "../../generated/prisma/client";
import { generateInvoicesForFeeStructure } from "./generateInvoicesForFeeStructure";

interface FeeItemInput {
  id?: string;
  label: string;
  amount: number;
}

const sumItems = (items: FeeItemInput[]): number =>
  items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

export const updateFeeStructure = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, isCompulsory } = req.body;
    const items: FeeItemInput[] | undefined = Array.isArray(req.body.items)
      ? req.body.items
      : undefined;

    const target = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    if (items !== undefined) {
      if (items.length === 0) {
        return res.status(400).json({ error: "At least one fee item is required" });
      }
      if (items.some((it) => !it.label || !(Number(it.amount) > 0))) {
        return res.status(400).json({ error: "Every fee item needs a label and a positive amount" });
      }
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (isCompulsory !== undefined) update.isCompulsory = isCompulsory;
    if (items !== undefined) {
      update.items = items as unknown as Prisma.InputJsonValue;
      update.amount = sumItems(items);
    }

    const updated = await prisma.feeStructure.update({
      where: { id: target.id },
      data: update,
    });

    const classIds = (updated.classIds as string[]) ?? [];
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    if (classIds.length > 0) {
      const invoiceUpdate: Record<string, unknown> = { amount: updated.amount };
      if (items !== undefined) {
        invoiceUpdate.items = items as unknown as Prisma.InputJsonValue;
      }
      await prisma.invoice.updateMany({
        where: {
          feeStructureId: target.id,
          status: "UNPAID",
        },
        data: invoiceUpdate,
      });
    }

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
        id: updated.id,
        classIds: (updated.classIds as string[]) ?? [],
        amount: updated.amount,
        items: (updated.items as Prisma.InputJsonValue | null) ?? undefined,
      },
      issuedByName,
    });

    res.json({
      feeStructure: {
        ...updated,
        classNames: classIds.map((cid) => classMap[cid] ?? "Unknown"),
      },
      invoicesGenerated,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Fee Structure");
    res.status(errorResponse.status).json(errorResponse);
  }
};