import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { SCORE_COMPONENT_TYPES, getSchemeInfo } from "../../utils/scoreScheme";

export const createScoreComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, maxScore, sortOrder, term, session } = req.body;

    if (!name || typeof name !== "string" || !String(name).trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    const componentType = type || "OTHER";
    if (!SCORE_COMPONENT_TYPES.includes(componentType)) {
      return res.status(400).json({
        error: `type must be one of: ${SCORE_COMPONENT_TYPES.join(", ")}`,
      });
    }

    const parsedMax = Number(maxScore);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0 || !Number.isInteger(parsedMax)) {
      return res.status(400).json({ error: "maxScore must be a positive whole number" });
    }

    const resolvedSession = await resolveSession(req.user.schoolId, term, session);

    const component = await prisma.scoreComponent.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        term,
        session: resolvedSession,
        name: String(name).trim(),
        type: componentType,
        maxScore: parsedMax,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Math.floor(Number(sortOrder)) : 0,
      },
    });

    const scheme = await getSchemeInfo(req.user.schoolId, term, resolvedSession);

    res.status(201).json({ component, schemeTotal: scheme.schemeTotal, complete: scheme.complete, warning: scheme.warning });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Score Component");
    res.status(errorResponse.status).json(errorResponse);
  }
};
