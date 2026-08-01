import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { SCORE_COMPONENT_TYPES, getSchemeInfo } from "../../utils/scoreScheme";

export const updateScoreComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, maxScore, sortOrder } = req.body;

    const component = await prisma.scoreComponent.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!component) {
      return res.status(404).json({ error: "Score component not found" });
    }

    if (type !== undefined) {
      if (!SCORE_COMPONENT_TYPES.includes(type)) {
        return res.status(400).json({
          error: `type must be one of: ${SCORE_COMPONENT_TYPES.join(", ")}`,
        });
      }
    }

    if (maxScore !== undefined) {
      const parsedMax = Number(maxScore);
      if (!Number.isFinite(parsedMax) || parsedMax <= 0 || !Number.isInteger(parsedMax)) {
        return res.status(400).json({ error: "maxScore must be a positive whole number" });
      }
    }

    const updated = await prisma.scoreComponent.update({
      where: { id: component.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(maxScore !== undefined ? { maxScore: Number(maxScore) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Math.floor(Number(sortOrder)) } : {}),
      },
    });

    const scheme = await getSchemeInfo(req.user.schoolId, component.term, component.session);

    res.json({ component: updated, schemeTotal: scheme.schemeTotal, complete: scheme.complete, warning: scheme.warning });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Score Component");
    res.status(errorResponse.status).json(errorResponse);
  }
};
