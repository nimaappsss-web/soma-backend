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
  session: string;
  components: Array<{
    id: string;
    schoolId: string;
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
 * Loads the configured score scheme for a school + term (resolving the
 * session), and reports whether the max scores sum to 100. The scheme is
 * school-wide for the term and shared across subjects.
 */
export const getSchemeInfo = async (
  schoolId: string,
  term: string,
  session?: string,
): Promise<SchemeInfo> => {
  const resolvedSession = await resolveSession(schoolId, term, session);

  const components = await prisma.scoreComponent.findMany({
    where: { schoolId, term, session: resolvedSession },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const schemeTotal = components.reduce((sum, c) => sum + c.maxScore, 0);

  return {
    session: resolvedSession,
    components,
    schemeTotal,
    complete: schemeTotal === 100,
    warning:
      schemeTotal !== 100
        ? `Scheme totals ${schemeTotal} — scores should add up to 100.`
        : null,
  };
};
