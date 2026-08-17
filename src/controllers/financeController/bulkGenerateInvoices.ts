import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { Prisma } from "../../generated/prisma/client";

export const bulkGenerateInvoices = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, classIds, term, session } = req.body;

    const targetClassIds: string[] = classIds?.length
      ? classIds
      : classId
        ? [classId]
        : [];

    if (targetClassIds.length === 0 || !term) {
      return res.status(400).json({ error: "classIds (or classId) and term are required" });
    }

    const resolvedSession = await resolveSession(req.user.schoolId, term, session);

    const [feeStructures, students, school] = await Promise.all([
      prisma.feeStructure.findMany({
        where: { schoolId: req.user.schoolId, term, session: resolvedSession },
      }),
      prisma.student.findMany({
        where: { schoolId: req.user.schoolId, classId: { in: targetClassIds }, status: "ACTIVE" },
        select: { id: true, classId: true },
      }),
      prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: { principalId: true },
      }),
    ]);

    const matchingFees = feeStructures.filter((f) =>
      ((f.classIds as string[]) ?? []).some((cid) => targetClassIds.includes(cid)),
    );

    if (matchingFees.length === 0) {
      return res.status(400).json({ error: "No fee structures exist for this class and term. Set up fees first." });
    }

    let issuedByName: string | null = null;
    if (school?.principalId) {
      const principal = await prisma.user.findUnique({
        where: { id: school.principalId },
        select: { name: true },
      });
      issuedByName = principal?.name ?? null;
    }

    const existing = await prisma.invoice.findMany({
      where: {
        schoolId: req.user.schoolId,
        studentId: { in: students.map((s) => s.id) },
        feeStructureId: { in: matchingFees.map((f) => f.id) },
      },
      select: { studentId: true, feeStructureId: true },
    });
    const existingSet = new Set(existing.map((i) => `${i.studentId}:${i.feeStructureId}`));

    const rows: {
      schoolId: string;
      studentId: string;
      feeStructureId: string;
      amount: number;
      items?: Prisma.InputJsonValue;
      issuedByName: string | null;
    }[] = [];

    for (const student of students) {
      for (const fee of matchingFees) {
        const feeClassIds = (fee.classIds as string[]) ?? [];
        if (!feeClassIds.includes(student.classId)) continue;
        const key = `${student.id}:${fee.id}`;
        if (existingSet.has(key)) continue;
        rows.push({
          schoolId: req.user.schoolId,
          studentId: student.id,
          feeStructureId: fee.id,
          amount: fee.amount,
          items: (fee.items as Prisma.InputJsonValue | null) ?? undefined,
          issuedByName,
        });
      }
    }

    if (rows.length > 0) {
      await prisma.invoice.createMany({ data: rows });
    }

    res.status(201).json({
      generated: rows.length,
      skipped: students.length * matchingFees.length - rows.length,
      students: students.length,
      feeStructures: matchingFees.length,
      classes: targetClassIds.length,
      session: resolvedSession,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Generate Invoices");
    res.status(errorResponse.status).json(errorResponse);
  }
};