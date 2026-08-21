import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const classRecord = await prisma.class.findFirst({
      where: { id, schoolId: req.user.schoolId },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecord._count.students > 0) {
      return res.status(400).json({
        error: `Cannot delete ${classRecord.name} — it still has ${classRecord._count.students} student${
          classRecord._count.students === 1 ? "" : "s"
        }. Move the students to another class first.`,
      });
    }

    await prisma.class.delete({ where: { id } });

    res.json({ message: "Class deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
