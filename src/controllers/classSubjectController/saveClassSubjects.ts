import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const saveClassSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classIds, subjectIds } = req.body ?? {};

    if (!Array.isArray(classIds) || !Array.isArray(subjectIds)) {
      return res.status(400).json({ error: "classIds and subjectIds must be arrays" });
    }

    const uniqueClassIds = [...new Set(classIds)];
    const uniqueSubjectIds = [...new Set(subjectIds)];

    if (uniqueClassIds.length === 0) {
      return res.status(400).json({ error: "classIds must not be empty" });
    }

    const validClasses = await prisma.class.findMany({
      where: { id: { in: uniqueClassIds }, schoolId },
      select: { id: true },
    });
    if (validClasses.length !== uniqueClassIds.length) {
      return res.status(400).json({ error: "One or more classes do not belong to this school" });
    }

    if (uniqueSubjectIds.length > 0) {
      const validSubjects = await prisma.subject.findMany({
        where: { id: { in: uniqueSubjectIds }, schoolId },
        select: { id: true },
      });
      if (validSubjects.length !== uniqueSubjectIds.length) {
        return res.status(400).json({ error: "One or more subjects do not belong to this school" });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.classSubject.deleteMany({
        where: { classId: { in: uniqueClassIds } },
      });

      if (uniqueSubjectIds.length > 0) {
        await tx.classSubject.createMany({
          data: uniqueClassIds.flatMap((classId) =>
            uniqueSubjectIds.map((subjectId) => ({ classId, subjectId, schoolId })),
          ),
        });
      }
    });

    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ level: "asc" }, { arm: "asc" }],
      select: {
        id: true,
        name: true,
        classSubjects: { select: { subjectId: true } },
      },
    });

    res.json({
      classes: classes.map((c) => ({
        classId: c.id,
        className: c.name,
        subjectIds: c.classSubjects.map((cs) => cs.subjectId),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Save Class Subjects");
    res.status(errorResponse.status).json(errorResponse);
  }
};
