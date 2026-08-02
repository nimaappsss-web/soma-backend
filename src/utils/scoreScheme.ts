import { prisma } from "./prisma";
import { resolveSession } from "./academicTerm";

export const SCORE_COMPONENT_TYPES = [
  "TEST",
  "ASSIGNMENT",
  "PROJECT",
  "PRACTICAL",
  "EXAM",
  "PHYSICAL",
  "OTHER",
] as const;

export type ScoreComponentType = (typeof SCORE_COMPONENT_TYPES)[number];

export interface SchemeInfo {
  schemeId: string | null;
  session: string;
  schoolTypes: string[];
  components: Array<{
    id: string;
    schoolId: string;
    schemeId: string;
    term: string;
    session: string;
    name: string;
    type: string;
    maxScore: number;
    sortOrder: number;
  }>;
  schemeTotal: number;
  complete: boolean;
  warning: string | null;
}

export interface SchemeListEntry {
  schemeId: string;
  schoolTypes: string[];
  components: Array<{
    id: string;
    schoolId: string;
    schemeId: string;
    term: string;
    session: string;
    name: string;
    type: string;
    maxScore: number;
    sortOrder: number;
  }>;
  schemeTotal: number;
  complete: boolean;
  warning: string | null;
}

/**
 * Normalizes a school-type array: trims, drops empties, dedupes, sorts.
 * Sorting makes the serialized JSON stable so the unique constraint
 * [schoolId, term, session, schoolTypes] treats equivalent sets identically.
 */
export const normalizeSchoolTypes = (types: unknown): string[] => {
  if (!Array.isArray(types)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of types) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.sort();
};

export const parseSchoolTypes = (json: string): string[] => {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/**
 * Loads the score configuration (ScoreScheme) for a school + term + school type,
 * resolving the session, and reports whether the max scores sum to 100.
 *
 * When a schoolType is provided, the scheme whose schoolTypes include it is
 * used (the no-overlap rule makes the match unique; if more than one matches,
 * the most specific — smallest — scheme wins). Without a schoolType the caller
 * gets an empty configuration, signalling that no single scheme is scoped to
 * the request.
 */
export const getSchemeInfo = async (
  schoolId: string,
  term: string,
  session?: string,
  schoolType?: string,
): Promise<SchemeInfo> => {
  const resolvedSession = await resolveSession(schoolId, term, session);

  let scheme = null;
  if (schoolType) {
    const candidates = await prisma.scoreScheme.findMany({
      where: { schoolId, term, session: resolvedSession },
    });
    const matches = candidates.filter((s) =>
      parseSchoolTypes(s.schoolTypes).includes(schoolType),
    );
    matches.sort(
      (a, b) =>
        parseSchoolTypes(a.schoolTypes).length -
        parseSchoolTypes(b.schoolTypes).length,
    );
    scheme = matches[0] ?? null;
  }

  const components = scheme
    ? await prisma.scoreComponent.findMany({
        where: { schemeId: scheme.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];

  const schemeTotal = components.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    schemeId: scheme?.id ?? null,
    session: resolvedSession,
    schoolTypes: scheme ? parseSchoolTypes(scheme.schoolTypes) : [],
    components,
    schemeTotal,
    complete: schemeTotal === 100,
    warning: !scheme
      ? "No configuration found for this school type."
      : schemeTotal !== 100
        ? `Scheme totals ${schemeTotal} — scores should add up to 100.`
        : null,
  };
};

/**
 * Loads a single configuration by schemeId (scoped to the school), with its
 * components and 100-mark total. Used by component CRUD to report totals.
 */
export const getSchemeInfoBySchemeId = async (
  schoolId: string,
  schemeId: string,
): Promise<SchemeInfo> => {
  const scheme = await prisma.scoreScheme.findFirst({
    where: { id: schemeId, schoolId },
  });

  if (!scheme) {
    return {
      schemeId: null,
      session: "",
      schoolTypes: [],
      components: [],
      schemeTotal: 0,
      complete: false,
      warning: "Configuration not found",
    };
  }

  const components = await prisma.scoreComponent.findMany({
    where: { schemeId: scheme.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const schemeTotal = components.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    schemeId: scheme.id,
    session: scheme.session,
    schoolTypes: parseSchoolTypes(scheme.schoolTypes),
    components,
    schemeTotal,
    complete: schemeTotal === 100,
    warning:
      schemeTotal !== 100
        ? `Scheme totals ${schemeTotal} — scores should add up to 100.`
        : null,
  };
};

/**
 * Lists every configuration (ScoreScheme) for a school + term, each with its
 * own components and 100-mark total. Used by the scheme configuration UI.
 */
export const listSchemes = async (
  schoolId: string,
  term: string,
  session?: string,
): Promise<{ session: string; schemes: SchemeListEntry[] }> => {
  const resolvedSession = await resolveSession(schoolId, term, session);

  const schemes = await prisma.scoreScheme.findMany({
    where: { schoolId, term, session: resolvedSession },
    orderBy: { createdAt: "asc" },
  });

  const schemesWithComponents = await Promise.all(
    schemes.map(async (scheme) => {
      const components = await prisma.scoreComponent.findMany({
        where: { schemeId: scheme.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const schemeTotal = components.reduce((sum, c) => sum + c.maxScore, 0);
      return {
        schemeId: scheme.id,
        schoolTypes: parseSchoolTypes(scheme.schoolTypes),
        components,
        schemeTotal,
        complete: schemeTotal === 100,
        warning:
          schemeTotal !== 100
            ? `Scheme totals ${schemeTotal} — scores should add up to 100.`
            : null,
      };
    }),
  );

  return { session: resolvedSession, schemes: schemesWithComponents };
};

/**
 * Finds the configuration for a school + term + schoolTypes set, creating it if
 * it does not exist. Enforces the no-overlap rule: a school type can belong to
 * only one configuration per term, so overlapping type sets are rejected with a
 * 409-class error (statusCode set on the thrown error).
 */
export const findOrCreateScheme = async (
  schoolId: string,
  term: string,
  session: string,
  schoolTypes: string[],
): Promise<{ scheme: { id: string; schoolTypes: string }; created: boolean }> => {
  const normalized = normalizeSchoolTypes(schoolTypes);
  if (normalized.length === 0) {
    const err = new Error("At least one school type is required");
    (err as any).statusCode = 400;
    throw err;
  }

  const serialized = JSON.stringify(normalized);

  const existing = await prisma.scoreScheme.findUnique({
    where: {
      schoolId_term_session_schoolTypes: {
        schoolId,
        term,
        session,
        schoolTypes: serialized,
      },
    },
    select: { id: true, schoolTypes: true },
  });
  if (existing) return { scheme: existing, created: false };

  const allSchemes = await prisma.scoreScheme.findMany({
    where: { schoolId, term, session },
    select: { id: true, schoolTypes: true },
  });

  for (const candidate of allSchemes) {
    const covered = parseSchoolTypes(candidate.schoolTypes);
    const overlap = normalized.filter((t) => covered.includes(t));
    if (overlap.length > 0) {
      const err = new Error(
        `School type${overlap.length > 1 ? "s" : ""} ${overlap.join(", ")} ${overlap.length > 1 ? "are" : "is"} already covered by another configuration for this term`,
      );
      (err as any).statusCode = 409;
      throw err;
    }
  }

  const scheme = await prisma.scoreScheme.create({
    data: { schoolId, term, session, schoolTypes: serialized },
    select: { id: true, schoolTypes: true },
  });

  return { scheme, created: true };
};
