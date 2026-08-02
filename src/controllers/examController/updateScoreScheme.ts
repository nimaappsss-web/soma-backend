import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  getSchemeInfoBySchemeId,
  normalizeSchoolTypes,
  parseSchoolTypes,
} from "../../utils/scoreScheme";

export const updateScoreScheme = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { schoolTypes } = req.body;

    const scheme = await prisma.scoreScheme.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!scheme) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    if (!Array.isArray(schoolTypes)) {
      return res.status(400).json({ error: "schoolTypes is required" });
    }

    const normalized = normalizeSchoolTypes(schoolTypes);
    if (normalized.length === 0) {
      return res.status(400).json({ error: "At least one school type is required" });
    }

    // No-overlap rule: these school types must not be covered by another
    // configuration for the same term.
    const others = await prisma.scoreScheme.findMany({
      where: {
        schoolId: scheme.schoolId,
        term: scheme.term,
        session: scheme.session,
        NOT: { id: scheme.id },
      },
      select: { id: true, schoolTypes: true },
    });

    for (const other of others) {
      const covered = parseSchoolTypes(other.schoolTypes);
      const overlap = normalized.filter((t) => covered.includes(t));
      if (overlap.length > 0) {
        return res.status(409).json({
          error: `School type${overlap.length > 1 ? "s" : ""} ${overlap.join(", ")} ${overlap.length > 1 ? "are" : "is"} already covered by another configuration for this term`,
        });
      }
    }

    const updated = await prisma.scoreScheme.update({
      where: { id: scheme.id },
      data: { schoolTypes: JSON.stringify(normalized) },
    });

    const info = await getSchemeInfoBySchemeId(scheme.schoolId, updated.id);

    res.json({
      schemeId: info.schemeId,
      schoolTypes: info.schoolTypes,
      components: info.components,
      schemeTotal: info.schemeTotal,
      complete: info.complete,
      warning: info.warning,
    });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Update Score Scheme", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};
