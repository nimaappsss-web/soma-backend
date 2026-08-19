// In-memory per-user record of when their data last changed server-side.
// Used by the frontend to decide whether a reopen should invalidate caches.
// Resets on restart — the frontend treats a missing value as "refetch to be safe".

const lastChanged = new Map<string, string>();

export const markDataChanged = (userId: string) => {
  lastChanged.set(userId, new Date().toISOString());
};

export const getDataVersion = (userId: string): string | null =>
  lastChanged.get(userId) ?? null;