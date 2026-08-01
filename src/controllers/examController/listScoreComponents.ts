import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSchemeInfo } from "../../utils/scoreScheme";

export const listScoreComponents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session } = req.query;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    const scheme = await getSchemeInfo(req.user.schoolId, term as string, session as string | undefined);

    res.json({
      term: term as string,
      session: scheme.session,
      components: scheme.components,
      schemeTotal: scheme.schemeTotal,
      complete: scheme.complete,
      warning: scheme.warning,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Score Components");
    res.status(errorResponse.status).json(errorResponse);
  }
};
