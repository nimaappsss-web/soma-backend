import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const LEVELS_BY_TYPE: Record<string, string[]> = {
  creche: ["Creche 1", "Creche 2"],
  kg: ["KG 1", "KG 2"],
  primary: ["Pry 1", "Pry 2", "Pry 3", "Pry 4", "Pry 5", "Pry 6"],
  secondary: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"],
};

export const listClasses = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const count = await prisma.class.count({
      where: { schoolId },
    });

    if (count === 0) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolType: true, arms: true },
      });

      const types: string[] = school?.schoolType ? JSON.parse(school.schoolType) : ["primary"];
      const levels = types.flatMap((t) => LEVELS_BY_TYPE[t] || []);
      const allArms: string[] = school?.arms ? JSON.parse(school.arms) : ["A", "B", "C"];
      const arms = types.includes("creche") ? [allArms[0] || "A"] : allArms;

      const data = [...new Set(levels)].flatMap((level) =>
        arms.map((arm) => ({
          schoolId,
          name: `${level} ${arm}`,
          level,
          arm,
        }))
      );

      await prisma.class.createMany({ data });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: [
        { level: "asc" },
        { arm: "asc" },
      ],
      select: { id: true, name: true, level: true, arm: true, createdAt: true, updatedAt: true, syncStatus: true, syncedAt: true, version: true },
    });

    const levels = [...new Set(classes.map((c) => c.level))];

    res.json({ classes, levels });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Classes");
    res.status(errorResponse.status).json(errorResponse);
  }
};
