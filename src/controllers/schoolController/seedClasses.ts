import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { SCHOOL_CLASS_MAP } from "../../utils/classSeed";

export const seedClasses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: { schoolType: true, arms: true },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const schoolTypes: string[] = school.schoolType
      ? JSON.parse(school.schoolType)
      : ["primary"];

    const arms: string[] = school.arms
      ? JSON.parse(school.arms)
      : [];

    const armList: string[] = arms.length > 0 ? arms : [""];

    const existingClasses = await prisma.class.findMany({
      where: { schoolId: req.user.schoolId },
      select: { name: true, arm: true, level: true },
    });

    const existingKeys = new Set(existingClasses.map((c) => `${c.level}|${c.arm}`));

    const toCreate: { name: string; level: string; arm: string; schoolId: string; schoolType: string }[] = [];

    for (const type of schoolTypes) {
      const entries = SCHOOL_CLASS_MAP[type];
      if (entries) {
        for (const entry of entries) {
          for (const arm of armList) {
            const key = `${entry.level}|${arm}`;
            if (!existingKeys.has(key)) {
              const armSuffix = arm ? ` ${arm}` : "";
              toCreate.push({
                name: `${entry.name}${armSuffix}`,
                level: entry.level,
                arm,
                schoolId: req.user.schoolId,
                schoolType: type,
              });
            }
          }
        }
      }
    }

    if (toCreate.length === 0) {
      return res.json({ message: "All required classes already exist", classes: [] });
    }

    await prisma.class.createMany({ data: toCreate, skipDuplicates: true });

    const created = await prisma.class.findMany({
      where: { schoolId: req.user.schoolId, name: { in: toCreate.map((c) => c.name) } },
      select: { id: true, name: true, level: true, arm: true },
    });

    res.status(201).json({ message: `${created.length} class(es) created`, classes: created });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Seed Classes");
    res.status(errorResponse.status).json(errorResponse);
  }
};
