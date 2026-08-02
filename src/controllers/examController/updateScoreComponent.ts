import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { SCORE_COMPONENT_TYPES, getSchemeInfoBySchemeId } from "../../utils/scoreScheme";

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

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      const duplicate = await prisma.scoreComponent.findFirst({
        where: {
          schemeId: component.schemeId,
          name: trimmedName,
          NOT: { id: component.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(400).json({
          error: `A component named "${trimmedName}" already exists in this configuration`,
        });
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

    const scheme = await getSchemeInfoBySchemeId(req.user.schoolId, component.schemeId);

    res.json({
      component: updated,
      schemeId: scheme.schemeId,
      schoolTypes: scheme.schoolTypes,
      schemeTotal: scheme.schemeTotal,
      complete: scheme.complete,
      warning: scheme.warning,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Score Component");
    res.status(errorResponse.status).json(errorResponse);
  }
};
