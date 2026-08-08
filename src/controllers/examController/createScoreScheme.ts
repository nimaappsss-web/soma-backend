import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import {
  findOrCreateScheme,
  getSchemeInfoBySchemeId,
} from "../../utils/scoreScheme";

export const createScoreScheme = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session, schoolTypes, id } = req.body;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    if (!Array.isArray(schoolTypes)) {
      return res.status(400).json({ error: "schoolTypes is required" });
    }

    const schoolId = req.user.schoolId;
    const resolvedSession = await resolveSession(schoolId, term, session);

    const { scheme } = await findOrCreateScheme(schoolId, term, resolvedSession, schoolTypes, id);
    const info = await getSchemeInfoBySchemeId(schoolId, scheme.id);

    res.status(201).json({
      schemeId: info.schemeId,
      schoolTypes: info.schoolTypes,
      components: info.components,
      schemeTotal: info.schemeTotal,
      complete: info.complete,
      warning: info.warning,
    });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Create Score Scheme", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};
