import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import {
  findOrCreateScheme,
  getSchemeInfoBySchemeId,
  parseSchoolTypes,
} from "../../utils/scoreScheme";

export const copyScoreComponents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { term, session, fromSession, schemeId } = req.body;

    if (!term) {
      return res.status(400).json({ error: "term is required" });
    }

    const schoolId = req.user.schoolId;
    const targetSession = await resolveSession(schoolId, term, session);

    let sources;

    if (schemeId) {
      const scheme = await prisma.scoreScheme.findFirst({
        where: { id: schemeId, schoolId },
      });
      if (!scheme) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      sources = [scheme];
    } else {
      let sourceTerm = term;
      let sourceSession = fromSession as string | undefined;
      if (!sourceSession || sourceSession === targetSession) {
        const latest = await prisma.scoreScheme.findFirst({
          where: {
            schoolId,
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

      sources = await prisma.scoreScheme.findMany({
        where: { schoolId, term: sourceTerm, session: sourceSession },
      });
    }

    if (sources.length === 0) {
      return res.status(400).json({ error: "No previous scheme found to copy" });
    }

    const copied: Array<{
      schemeId: string;
      schoolTypes: string[];
      components: unknown[];
      schemeTotal: number;
      complete: boolean;
      warning: string | null;
    }> = [];

    for (const source of sources) {
      const schoolTypes = parseSchoolTypes(source.schoolTypes);
      if (schoolTypes.length === 0) continue;

      let target;
      try {
        target = await findOrCreateScheme(schoolId, term, targetSession, schoolTypes);
      } catch (err) {
        const status = (err as any)?.statusCode ?? 500;
        return res.status(status).json({
          error:
            status === 409
              ? `${(err as Error).message}. Rename or merge the target configurations first.`
              : (err as Error).message,
        });
      }

      const sourceComponents = await prisma.scoreComponent.findMany({
        where: { schemeId: source.id },
        orderBy: { sortOrder: "asc" },
      });

      if (sourceComponents.length > 0) {
        await prisma.scoreComponent.createMany({
          data: sourceComponents.map((c) => ({
            schoolId,
            schemeId: target.scheme.id,
            term,
            session: targetSession,
            name: c.name,
            type: c.type,
            maxScore: c.maxScore,
            sortOrder: c.sortOrder,
          })),
          skipDuplicates: true,
        });
      }

      const schemeInfo = await getSchemeInfoBySchemeId(schoolId, target.scheme.id);
      copied.push({
        schemeId: schemeInfo.schemeId!,
        schoolTypes: schemeInfo.schoolTypes,
        components: schemeInfo.components,
        schemeTotal: schemeInfo.schemeTotal,
        complete: schemeInfo.complete,
        warning: schemeInfo.warning,
      });
    }

    res.json({
      message: `Scheme${copied.length > 1 ? "s" : ""} copied to ${targetSession}`,
      session: targetSession,
      schemes: copied,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Copy Score Components");
    res.status(errorResponse.status).json(errorResponse);
  }
};
