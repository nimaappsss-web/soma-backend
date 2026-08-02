import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSchemeInfoBySchemeId } from "../../utils/scoreScheme";

export const deleteScoreComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const component = await prisma.scoreComponent.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!component) {
      return res.status(404).json({ error: "Score component not found" });
    }

    const schemeId = component.schemeId;

    await prisma.scoreComponent.delete({ where: { id: component.id } });

    const scheme = await getSchemeInfoBySchemeId(req.user.schoolId, schemeId);

    res.json({
      message: "Score component deleted",
      schemeId: scheme.schemeId,
      schoolTypes: scheme.schoolTypes,
      schemeTotal: scheme.schemeTotal,
      complete: scheme.complete,
      warning: scheme.warning,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Score Component");
    res.status(errorResponse.status).json(errorResponse);
  }
};
