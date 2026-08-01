import { prisma } from "./prisma";

export type BlockReasonType = "HOLIDAY" | "WEEKEND" | "OUT_OF_TERM" | "FUTURE";

export interface DayClassification {
  available: boolean;
  type?: BlockReasonType;
  message?: string;
}

export const toUtcDateString = (date: Date): string =>
  date.toISOString().split("T")[0];

export const isWeekend = (date: Date): boolean =>
  date.getUTCDay() === 0 || date.getUTCDay() === 6;

export const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Classifies whether attendance may be marked for a given date for a school.
 *
 * Precedence for the "reason" surfaced to the client:
 *   saved holiday > outside term > weekend > future
 *
 * A school with no academic terms configured is treated as in-term so a fresh
 * school is not locked out entirely.
 */
export const classifySchoolDay = async (
  schoolId: string,
  date: Date,
  options?: { allowFuture?: boolean },
): Promise<DayClassification> => {
  const utcDay = startOfUtcDay(date);
  const dateStr = toUtcDateString(utcDay);

  const holiday = await prisma.holiday.findUnique({
    where: { schoolId_date: { schoolId, date: utcDay } },
    select: { reason: true },
  });

  if (holiday) {
    return {
      available: false,
      type: "HOLIDAY",
      message: holiday.reason,
    };
  }

  const today = startOfUtcDay(new Date());
  if (!options?.allowFuture && utcDay > today) {
    return {
      available: false,
      type: "FUTURE",
      message: "Attendance cannot be marked for a future date",
    };
  }

  const term = await prisma.academicTerm.findFirst({
    where: { schoolId, startDate: { lte: utcDay }, endDate: { gte: utcDay } },
    select: { id: true },
  });

  if (!term) {
    const termCount = await prisma.academicTerm.count({ where: { schoolId } });
    if (termCount > 0) {
      return {
        available: false,
        type: "OUT_OF_TERM",
        message: "Date falls outside the current academic term",
      };
    }
  }

  if (isWeekend(utcDay)) {
    const dayName = utcDay.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    return {
      available: false,
      type: "WEEKEND",
      message: dayName,
    };
  }

  return { available: true };
};

/**
 * Batch variant for building calendars: classifies a set of UTC date-only
 * strings in a single pass over the holiday and term tables.
 */
export const classifySchoolDays = async (
  schoolId: string,
  dates: Date[],
): Promise<Map<string, DayClassification>> => {
  const utcDates = dates.map((d) => startOfUtcDay(d));
  const dateStrs = utcDates.map(toUtcDateString);

  const holidays = await prisma.holiday.findMany({
    where: { schoolId, date: { in: utcDates } },
    select: { date: true, reason: true },
  });

  const terms = await prisma.academicTerm.findMany({
    where: { schoolId },
    select: { startDate: true, endDate: true },
  });

  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    holidayMap.set(toUtcDateString(h.date), h.reason);
  }

  const today = startOfUtcDay(new Date());
  const result = new Map<string, DayClassification>();

  for (let i = 0; i < utcDates.length; i++) {
    const utcDay = utcDates[i];
    const dateStr = dateStrs[i];

    const holidayReason = holidayMap.get(dateStr);
    if (holidayReason) {
      result.set(dateStr, { available: false, type: "HOLIDAY", message: holidayReason });
      continue;
    }

    if (utcDay > today) {
      result.set(dateStr, { available: false, type: "FUTURE", message: "Attendance cannot be marked for a future date" });
      continue;
    }

    const inTerm = terms.some((t) => utcDay >= t.startDate && utcDay <= t.endDate);
    if (!inTerm && terms.length > 0) {
      result.set(dateStr, { available: false, type: "OUT_OF_TERM", message: "Date falls outside the current academic term" });
      continue;
    }

    if (isWeekend(utcDay)) {
      const dayName = utcDay.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      result.set(dateStr, { available: false, type: "WEEKEND", message: dayName });
      continue;
    }

    result.set(dateStr, { available: true });
  }

  return result;
};
