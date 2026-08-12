import { Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../utils/prisma";
import { Prisma } from "../generated/prisma/client";
import { createErrorResponse } from "../utils/errorHandler";

interface ConfigBody {
  configType?: string;
  name?: string;
  schedule?: unknown;
  subjectIds?: string[];
  targets?: Record<string, number>;
  doublePeriods?: unknown;
}

const VALID_TYPES = ["primary", "kg", "creche", "junior-secondary", "senior-secondary", "secondary", "custom"];

const TYPE_NAMES: Record<string, string> = {
  creche: "Creche",
  kg: "Kindergarten",
  primary: "Primary",
  "junior-secondary": "Junior Secondary",
  "senior-secondary": "Senior Secondary",
  secondary: "Secondary",
  custom: "Custom",
};

const defaultName = (configType: string): string =>
  `${TYPE_NAMES[configType] ?? configType[0].toUpperCase() + configType.slice(1)} configuration`;

const sanitize = (b: ConfigBody) => {
  const configType = (b.configType ?? "custom").trim().toLowerCase();
  if (!VALID_TYPES.includes(configType)) {
    throw new Error(`configType must be one of: ${VALID_TYPES.join(", ")}`);
  }
  const subjectIds = Array.isArray(b.subjectIds) ? b.subjectIds.map(String) : [];
  const targets: Record<string, number> = (b.targets ?? {}) as Record<string, number>;
  return {
    configType,
    name: (b.name ?? defaultName(configType)).trim(),
    schedule: (b.schedule ?? []) as Prisma.InputJsonValue,
    subjectIds: subjectIds as unknown as Prisma.InputJsonValue,
    targets: targets as unknown as Prisma.InputJsonValue,
    doublePeriods: (b.doublePeriods ?? []) as unknown as Prisma.InputJsonValue,
  };
};

export const listTimetableConfigs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.schoolId) return res.status(401).json({ error: "Not authenticated" });
    const configs = await prisma.timetableConfig.findMany({
      where: { schoolId: req.user.schoolId },
    });
    res.json({
      configs: configs.map((c) => ({
        id: c.id,
        configType: c.configType,
        name: c.name,
        schedule: c.schedule,
        subjectIds: c.subjectIds,
        targets: c.targets,
        doublePeriods: c.doublePeriods,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    const err = createErrorResponse(error, "List Timetable Configs");
    res.status(err.status).json(err);
  }
};

export const upsertTimetableConfig = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.schoolId) return res.status(401).json({ error: "Not authenticated" });
    const data = sanitize(req.body as ConfigBody);

    const existing = await prisma.timetableConfig.findFirst({
      where: { schoolId: req.user.schoolId, configType: data.configType },
    });

    const config = existing
      ? await prisma.timetableConfig.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            schedule: data.schedule,
            subjectIds: data.subjectIds,
            targets: data.targets,
            doublePeriods: data.doublePeriods,
          },
        })
      : await prisma.timetableConfig.create({
          data: {
            schoolId: req.user.schoolId,
            configType: data.configType,
            name: data.name,
            schedule: data.schedule,
            subjectIds: data.subjectIds,
            targets: data.targets,
            doublePeriods: data.doublePeriods,
          },
        });

    res.status(existing ? 200 : 201).json({ config: config });
  } catch (error) {
    const err = createErrorResponse(error, "Save Timetable Config");
    res.status(err.status).json(err);
  }
};

export const deleteTimetableConfig = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.schoolId) return res.status(401).json({ error: "Not authenticated" });
    const { configType } = req.params;
    const existing = await prisma.timetableConfig.findFirst({
      where: { schoolId: req.user.schoolId, configType },
    });
    if (!existing) return res.status(404).json({ error: "Config not found" });
    await prisma.timetableConfig.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    const err = createErrorResponse(error, "Delete Timetable Config");
    res.status(err.status).json(err);
  }
};