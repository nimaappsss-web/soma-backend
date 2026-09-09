import { prisma } from "../../utils/prisma";

const DAY = 24 * 60 * 60 * 1000;

export type SchoolSyncInfo = {
  lastSyncAt: Date | null;
  syncStatus: "synced" | "stale" | "silent";
};

const SILENT: SchoolSyncInfo = { lastSyncAt: null, syncStatus: "silent" };

/**
 * Derives platform "sync" activity for a set of schools from the freshest
 * data signals flowing to the platform: session activity (device logins),
 * student updates, invoices, payments, announcements, and academic terms.
 */
export const computeSchoolSync = async (
  schoolIds: string[],
): Promise<Map<string, SchoolSyncInfo>> => {
  const map = new Map<string, SchoolSyncInfo>();
  if (schoolIds.length === 0) return map;
  for (const id of schoolIds) map.set(id, SILENT);

  const [students, invoices, payments, announcements, academicTerms, sessions] =
    await Promise.all([
      prisma.student.groupBy({
        by: ["schoolId"],
        where: { schoolId: { in: schoolIds } },
        _max: { updatedAt: true },
      }),
      prisma.invoice.groupBy({
        by: ["schoolId"],
        where: { schoolId: { in: schoolIds } },
        _max: { updatedAt: true },
      }),
      prisma.payment.groupBy({
        by: ["schoolId"],
        where: { schoolId: { in: schoolIds } },
        _max: { createdAt: true },
      }),
      prisma.announcement.groupBy({
        by: ["schoolId"],
        where: { schoolId: { in: schoolIds } },
        _max: { createdAt: true },
      }),
      prisma.academicTerm.groupBy({
        by: ["schoolId"],
        where: { schoolId: { in: schoolIds } },
        _max: { updatedAt: true },
      }),
      prisma.session.findMany({
        where: { user: { schoolId: { in: schoolIds } } },
        select: {
          user: { select: { schoolId: true } },
          lastActivityAt: true,
        },
      }),
    ]);

  const consider = (schoolId: string | null, t: Date | null) => {
    if (!schoolId || !t) return;
    const current = map.get(schoolId);
    if (current && (!current.lastSyncAt || t > current.lastSyncAt)) {
      current.lastSyncAt = t;
    }
  };

  for (const row of students) consider(row.schoolId, row._max.updatedAt);
  for (const row of invoices) consider(row.schoolId, row._max.updatedAt);
  for (const row of payments) consider(row.schoolId, row._max.createdAt);
  for (const row of announcements) consider(row.schoolId, row._max.createdAt);
  for (const row of academicTerms) consider(row.schoolId, row._max.updatedAt);
  for (const s of sessions) consider(s.user.schoolId, s.lastActivityAt);

  const now = Date.now();
  for (const info of map.values()) {
    if (!info.lastSyncAt) continue;
    const age = now - info.lastSyncAt.getTime();
    info.syncStatus = age <= 7 * DAY ? "synced" : age <= 30 * DAY ? "stale" : "silent";
  }

  return map;
};