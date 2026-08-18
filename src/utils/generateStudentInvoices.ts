import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma/client";
import { resolveSession } from "./academicTerm";

interface StudentTarget {
  id: string;
  classId: string;
}

/**
 * Auto-generate invoices for newly created students from any fee structures
 * that cover their class for the current academic session. Idempotent — never
 * duplicates an existing invoice for the same student + fee structure.
 */
export const generateInvoicesForStudents = async (
  schoolId: string,
  students: StudentTarget[],
): Promise<number> => {
  if (students.length === 0) return 0;

  const session = await resolveSession(schoolId);

  const feeStructures = await prisma.feeStructure.findMany({
    where: { schoolId, session },
    select: { id: true, classIds: true, amount: true, items: true },
  });

  if (feeStructures.length === 0) return 0;

  const feesByClass = new Map<string, (typeof feeStructures)[number][]>();
  for (const fee of feeStructures) {
    const classIds = (fee.classIds as string[]) ?? [];
    for (const cid of classIds) {
      const list = feesByClass.get(cid) ?? [];
      list.push(fee);
      feesByClass.set(cid, list);
    }
  }

  const pairs: { studentId: string; feeStructureId: string }[] = [];
  for (const student of students) {
    const fees = feesByClass.get(student.classId);
    if (!fees) continue;
    for (const fee of fees) {
      pairs.push({ studentId: student.id, feeStructureId: fee.id });
    }
  }

  if (pairs.length === 0) return 0;

  const studentIds = [...new Set(pairs.map((p) => p.studentId))];
  const feeIds = [...new Set(pairs.map((p) => p.feeStructureId))];

  const existing = await prisma.invoice.findMany({
    where: {
      schoolId,
      studentId: { in: studentIds },
      feeStructureId: { in: feeIds },
    },
    select: { studentId: true, feeStructureId: true },
  });
  const existingSet = new Set(
    existing.map((i) => `${i.studentId}:${i.feeStructureId}`),
  );

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

  const rows: {
    schoolId: string;
    studentId: string;
    feeStructureId: string;
    amount: number;
    items?: Prisma.InputJsonValue;
    issuedByName: string | null;
  }[] = [];

  for (const pair of pairs) {
    if (existingSet.has(`${pair.studentId}:${pair.feeStructureId}`)) continue;
    const fee = feeStructures.find((f) => f.id === pair.feeStructureId);
    if (!fee) continue;
    rows.push({
      schoolId,
      studentId: pair.studentId,
      feeStructureId: fee.id,
      amount: fee.amount,
      items: (fee.items as Prisma.InputJsonValue | null) ?? undefined,
      issuedByName,
    });
  }

  if (rows.length > 0) {
    await prisma.invoice.createMany({ data: rows });
  }

  return rows.length;
};
