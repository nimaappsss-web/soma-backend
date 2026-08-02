import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSchemeInfo, listSchemes } from "../../utils/scoreScheme";

export const listScoreComponents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session, schoolType } = req.query;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    // With a schoolType, return the single configuration covering that type.
    if (schoolType) {
      const scheme = await getSchemeInfo(
        req.user.schoolId,
        term as string,
        session as string | undefined,
        schoolType as string,
      );

      return res.json({
        term: term as string,
        session: scheme.session,
        schemeId: scheme.schemeId,
        schoolTypes: scheme.schoolTypes,
        components: scheme.components,
        schemeTotal: scheme.schemeTotal,
        complete: scheme.complete,
        warning: scheme.warning,
      });
    }

    // Without a schoolType, return every configuration for the term. When there
    // is exactly one configuration, also expose the flat legacy shape so
    // existing consumers (teacher scoring, scheme config UI) keep working.
    const result = await listSchemes(
      req.user.schoolId,
      term as string,
      session as string | undefined,
    );

    if (result.schemes.length === 1) {
      const s = result.schemes[0];
      return res.json({
        term: term as string,
        session: result.session,
        schemes: result.schemes,
        schemeId: s.schemeId,
        schoolTypes: s.schoolTypes,
        components: s.components,
        schemeTotal: s.schemeTotal,
        complete: s.complete,
        warning: s.warning,
      });
    }

    res.json({
      term: term as string,
      session: result.session,
      schemes: result.schemes,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Score Components");
    res.status(errorResponse.status).json(errorResponse);
  }
};
