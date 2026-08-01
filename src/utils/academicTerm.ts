import { prisma } from "./prisma";

const termMap: Record<string, string> = {
  "1": "1", "1st": "1", "first": "1",
  "2": "2", "2nd": "2", "second": "2",
  "3": "3", "3rd": "3", "third": "3",
};

export const normalizeTerm = (term: string): string | undefined =>
  termMap[String(term).toLowerCase()];

export const isTermCurrent = (startDate: Date, endDate: Date): boolean => {
  const now = new Date();
  return now >= startDate && now <= endDate;
};

export const sessionFromStartDate = (startDate: Date): string => {
  const year = startDate.getFullYear();
  return `${year}/${year + 1}`;
};

/**
 * Resolves the academic session for a school + term. If an explicit session is
 * provided it wins (caller override). Otherwise it is derived from the term's
 * startDate (e.g. a 2025 start -> "2025/2026"), falling back to the current
 * term's startDate, then to the current year.
 */
export const resolveSession = async (
  schoolId: string,
  term?: string,
  explicitSession?: string
): Promise<string> => {
  if (explicitSession) return explicitSession;

  const normalizedTerm = term ? normalizeTerm(term) : undefined;

  const termRecord = normalizedTerm
    ? await prisma.academicTerm.findUnique({
        where: { schoolId_term: { schoolId, term: normalizedTerm } },
        select: { startDate: true },
      })
    : null;

  if (termRecord) return sessionFromStartDate(termRecord.startDate);

  const now = new Date();
  const currentTerm = await prisma.academicTerm.findFirst({
    where: { schoolId, startDate: { lte: now }, endDate: { gte: now } },
    select: { startDate: true },
  });

  if (currentTerm) return sessionFromStartDate(currentTerm.startDate);

  return sessionFromStartDate(now);
};
