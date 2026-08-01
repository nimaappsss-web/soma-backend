import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { getSchemeInfo } from "../../utils/scoreScheme";

export const copyScoreComponents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session, fromSession } = req.body;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    const targetSession = await resolveSession(req.user.schoolId, term, session);

    let sourceTerm = term;
    let sourceSession = fromSession as string | undefined;
    if (!sourceSession || sourceSession === targetSession) {
      const latest = await prisma.scoreComponent.findFirst({
        where: {
          schoolId: req.user.schoolId,
          NOT: { term, session: targetSession },
        },
        orderBy: { createdAt: "desc" },
        select: { session: true, term: true },
      });
      sourceSession = latest?.session;
      if (latest?.term) sourceTerm = latest.term;
    }

    if (!sourceSession) {
      return res.status(400).json({ error: "No previous scheme found to copy" });
    }

    const sourceComponents = await prisma.scoreComponent.findMany({
      where: { schoolId: req.user.schoolId, term: sourceTerm, session: sourceSession },
      orderBy: { sortOrder: "asc" },
    });

    if (sourceComponents.length === 0) {
      return res.status(400).json({ error: "No components found in the source scheme" });
    }

    await prisma.scoreComponent.createMany({
      data: sourceComponents.map((c) => ({
        schoolId: c.schoolId,
        term,
        session: targetSession,
        name: c.name,
        type: c.type,
        maxScore: c.maxScore,
        sortOrder: c.sortOrder,
      })),
      skipDuplicates: true,
    });

    const scheme = await getSchemeInfo(req.user.schoolId, term, targetSession);

    res.json({
      message: `Scheme copied from ${sourceSession}`,
      session: targetSession,
      components: scheme.components,
      schemeTotal: scheme.schemeTotal,
      complete: scheme.complete,
      warning: scheme.warning,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Copy Score Components");
    res.status(errorResponse.status).json(errorResponse);
  }
};
