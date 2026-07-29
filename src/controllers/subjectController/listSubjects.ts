import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSubjectsForSchool } from "../../data/subjects";

export const listSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const count = await prisma.subject.count({
      where: { schoolId },
    });

    if (count === 0) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolType: true },
      });

      const types: string[] = school?.schoolType ? JSON.parse(school.schoolType) : ["primary"];
      const subjects = getSubjectsForSchool(types);

      if (subjects.length > 0) {
        await prisma.subject.createMany({
          data: subjects.map((s) => ({
            schoolId,
            name: s.name,
            code: s.code,
          })),
        });
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where = { schoolId };

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, active: true, createdAt: true, updatedAt: true, syncStatus: true, syncedAt: true, version: true },
        skip,
        take: limit,
      }),
      prisma.subject.count({ where }),
    ]);

    res.json({ subjects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Subjects");
    res.status(errorResponse.status).json(errorResponse);
  }
};
