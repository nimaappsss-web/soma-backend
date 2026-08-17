import { prisma } from "./prisma";

export const generateReceiptNo = async (
  schoolId: string,
): Promise<string> => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { schoolCode: true },
  });

  const code = (school?.schoolCode || schoolId.slice(0, 4).toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const year = new Date().getFullYear();

  const count = await prisma.payment.count({
    where: { schoolId, receiptNo: { not: null } },
  });

  return `${code}-${year}-${String(count + 1).padStart(4, "0")}`;
};