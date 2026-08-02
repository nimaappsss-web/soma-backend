import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { inferSchoolTypeFromLevel } from "../../utils/classSeed";

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, level, arm, schoolType } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: "Name and level are required" });
    }

    const existing = await prisma.class.findFirst({
      where: { schoolId: req.user.schoolId, name },
    });

    if (existing) {
      return res.status(400).json({ error: "Class already exists" });
    }

    let resolvedSchoolType: string;
    if (schoolType && typeof schoolType === "string" && schoolType.trim()) {
      resolvedSchoolType = schoolType.trim();
    } else {
      const school = await prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: { schoolType: true },
      });
      const schoolTypes = school?.schoolType ? JSON.parse(school.schoolType) : [];
      resolvedSchoolType = inferSchoolTypeFromLevel(level, schoolTypes);
    }

    const newClass = await prisma.class.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        level,
        arm: arm || "",
        schoolType: resolvedSchoolType,
      },
    });

    res.status(201).json({ class: newClass });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
