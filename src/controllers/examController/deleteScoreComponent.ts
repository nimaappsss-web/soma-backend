import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSchemeInfo } from "../../utils/scoreScheme";

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

    await prisma.scoreComponent.delete({ where: { id: component.id } });

    const scheme = await getSchemeInfo(req.user.schoolId, component.term, component.session);

    res.json({ message: "Score component deleted", schemeTotal: scheme.schemeTotal, complete: scheme.complete, warning: scheme.warning });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Score Component");
    res.status(errorResponse.status).json(errorResponse);
  }
};
