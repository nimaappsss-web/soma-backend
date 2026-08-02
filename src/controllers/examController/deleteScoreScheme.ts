import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { listSchemes } from "../../utils/scoreScheme";

export const deleteScoreScheme = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const scheme = await prisma.scoreScheme.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      include: { _count: { select: { scoreComponents: true } } },
    });

    if (!scheme) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    await prisma.scoreScheme.delete({ where: { id: scheme.id } });

    const remaining = await listSchemes(req.user.schoolId, scheme.term, scheme.session);

    res.json({
      message: `Configuration deleted (${scheme._count.scoreComponents} component${scheme._count.scoreComponents === 1 ? "" : "s"} removed)`,
      session: remaining.session,
      schemes: remaining.schemes,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Score Scheme");
    res.status(errorResponse.status).json(errorResponse);
  }
};
