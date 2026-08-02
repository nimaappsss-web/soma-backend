import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import {
  SCORE_COMPONENT_TYPES,
  findOrCreateScheme,
  getSchemeInfoBySchemeId,
} from "../../utils/scoreScheme";

export const createScoreComponent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, maxScore, sortOrder, term, session, schoolTypes, schemeId } = req.body;

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

    const schoolId = req.user.schoolId;
    const resolvedSession = await resolveSession(schoolId, term, session);

    let targetSchemeId: string;

    if (schemeId) {
      const existingScheme = await prisma.scoreScheme.findFirst({
        where: { id: schemeId, schoolId, term, session: resolvedSession },
        select: { id: true },
      });
      if (!existingScheme) {
        return res.status(400).json({ error: "Configuration not found for this school and term" });
      }
      targetSchemeId = existingScheme.id;
    } else if (Array.isArray(schoolTypes)) {
      const { scheme } = await findOrCreateScheme(schoolId, term, resolvedSession, schoolTypes);
      targetSchemeId = scheme.id;
    } else {
      // Legacy path: no schoolTypes — fall back to the sole configuration for
      // this term (preserves the old school-wide scheme behaviour).
      const schemes = await prisma.scoreScheme.findMany({
        where: { schoolId, term, session: resolvedSession },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (schemes.length === 0) {
        return res.status(400).json({ error: "schoolTypes or schemeId is required" });
      }
      if (schemes.length > 1) {
        return res.status(400).json({ error: "Multiple configurations exist for this term; schoolTypes is required" });
      }
      targetSchemeId = schemes[0].id;
    }

    const trimmedName = String(name).trim();
    const existingComponent = await prisma.scoreComponent.findFirst({
      where: { schemeId: targetSchemeId, name: trimmedName },
      select: { id: true },
    });
    if (existingComponent) {
      return res.status(400).json({
        error: `A component named "${trimmedName}" already exists in this configuration`,
      });
    }

    const component = await prisma.scoreComponent.create({
      data: {
        id: req.body.id || undefined,
        schoolId,
        schemeId: targetSchemeId,
        term,
        session: resolvedSession,
        name: trimmedName,
        type: componentType,
        maxScore: parsedMax,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Math.floor(Number(sortOrder)) : 0,
      },
    });

    const scheme = await getSchemeInfoBySchemeId(schoolId, targetSchemeId);

    res.status(201).json({
      component,
      schemeId: scheme.schemeId,
      schoolTypes: scheme.schoolTypes,
      schemeTotal: scheme.schemeTotal,
      complete: scheme.complete,
      warning: scheme.warning,
    });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Create Score Component", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};
