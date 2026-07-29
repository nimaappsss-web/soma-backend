import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const classDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const classRecord = await prisma.class.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: {
        id: true,
        name: true,
        level: true,
        arm: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { students: true } },
        formTeachers: {
          select: { id: true, name: true, email: true, phone: true },
          take: 1,
        },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    const { _count, formTeachers, ...rest } = classRecord;

    res.json({
      class: {
        ...rest,
        studentCount: _count.students,
        formTeacher: formTeachers[0] || null,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Class Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
