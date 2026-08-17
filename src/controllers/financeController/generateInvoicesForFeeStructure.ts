import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

export const generateInvoicesForFeeStructure = async (params: {
  schoolId: string;
  feeStructure: {
    id: string;
    classIds: string[];
    amount: number;
    items?: Prisma.InputJsonValue | null;
  };
  issuedByName: string | null;
}): Promise<number> => {
  const { schoolId, feeStructure, issuedByName } = params;
  const classIds = (feeStructure.classIds as string[]) ?? [];

  if (classIds.length === 0) return 0;

  const students = await prisma.student.findMany({
    where: { schoolId, classId: { in: classIds }, status: "ACTIVE" },
    select: { id: true, classId: true },
  });

  if (students.length === 0) return 0;

  const existing = await prisma.invoice.findMany({
    where: {
      schoolId,
      studentId: { in: students.map((s) => s.id) },
      feeStructureId: feeStructure.id,
    },
    select: { studentId: true },
  });
  const existingSet = new Set(existing.map((i) => i.studentId));

  const rows: {
    schoolId: string;
    studentId: string;
    feeStructureId: string;
    amount: number;
    items?: Prisma.InputJsonValue;
    issuedByName: string | null;
  }[] = [];

  for (const student of students) {
    if (!classIds.includes(student.classId)) continue;
    if (existingSet.has(student.id)) continue;
    rows.push({
      schoolId,
      studentId: student.id,
      feeStructureId: feeStructure.id,
      amount: feeStructure.amount,
      items: (feeStructure.items as Prisma.InputJsonValue | null) ?? undefined,
      issuedByName,
    });
  }

  if (rows.length > 0) {
    await prisma.invoice.createMany({ data: rows });
  }

  return rows.length;
};