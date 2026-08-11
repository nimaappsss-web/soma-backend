import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listClassSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

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
    const errorResponse = createErrorResponse(error, "List Class Subjects");
    res.status(errorResponse.status).json(errorResponse);
  }
};
