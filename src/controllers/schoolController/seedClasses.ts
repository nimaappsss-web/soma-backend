import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const classMap: Record<string, { name: string; level: string }[]> = {
  creche: [{ name: "Creche", level: "Creche" }],
  kg: [{ name: "KG 1", level: "KG" }, { name: "KG 2", level: "KG" }],
  primary: [
    { name: "Pry 1", level: "Pry 1" },
    { name: "Pry 2", level: "Pry 2" },
    { name: "Pry 3", level: "Pry 3" },
    { name: "Pry 4", level: "Pry 4" },
    { name: "Pry 5", level: "Pry 5" },
    { name: "Pry 6", level: "Pry 6" },
  ],
  secondary: [
    { name: "JSS 1", level: "JSS 1" },
    { name: "JSS 2", level: "JSS 2" },
    { name: "JSS 3", level: "JSS 3" },
    { name: "SS 1", level: "SS 1" },
    { name: "SS 2", level: "SS 2" },
    { name: "SS 3", level: "SS 3" },
  ],
};

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

    const toCreate: { name: string; level: string; arm: string; schoolId: string }[] = [];

    for (const type of schoolTypes) {
      const entries = classMap[type];
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
              });
            }
          }
        }
      }
    }

    if (toCreate.length === 0) {
      return res.json({ message: "All required classes already exist", classes: [] });
    }

    await prisma.class.createMany({ data: toCreate });

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
