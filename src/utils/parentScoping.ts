import { prisma } from "./prisma";

/**
 * Resolves the student IDs a parent user is linked to, matching by the parent's
 * email/phone against Student.parentEmail / Student.parentPhone.
 */
export const studentIdsForParent = async (
  schoolId: string,
  parentUserId: string,
): Promise<string[]> => {
  const parent = await prisma.user.findUnique({
    where: { id: parentUserId },
    select: { email: true, phone: true },
  });
  if (!parent) return [];

  const emails = [parent.email].filter(Boolean) as string[];
  const phones = [parent.phone].filter(Boolean) as string[];

  if (emails.length === 0 && phones.length === 0) return [];

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      OR: [
        ...(emails.length > 0 ? [{ parentEmail: { in: emails } }] : []),
        ...(phones.length > 0 ? [{ parentPhone: { in: phones } }] : []),
      ],
    },
    select: { id: true },
  });

  return students.map((s) => s.id);
};
