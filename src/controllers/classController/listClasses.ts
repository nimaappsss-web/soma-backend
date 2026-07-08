import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const DEFAULT_LEVELS = ["KG1", "KG2", "P1", "P2", "P3", "P4", "P5", "P6", "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const DEFAULT_ARMS = ["A", "B", "C"];

export const listClasses = async (req: Request, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || (req as any).user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const count = await prisma.class.count({
      where: { schoolId },
    });

    if (count === 0) {
      const data = DEFAULT_LEVELS.flatMap((level) =>
        DEFAULT_ARMS.map((arm) => ({
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
      select: { id: true, name: true, level: true, arm: true, createdAt: true },
    });

    const levels = [...new Set(classes.map((c) => c.level))];

    res.json({ classes, levels });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Classes");
    res.status(errorResponse.status).json(errorResponse);
  }
};
