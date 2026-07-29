import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const student = await prisma.student.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    await prisma.student.delete({ where: { id } });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Student");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const bulkDeleteStudents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { ids } = req.body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Student IDs are required" });
    }

    const result = await prisma.student.deleteMany({
      where: {
        id: { in: ids },
        schoolId: req.user.schoolId,
      },
    });

    res.json({ message: `${result.count} student(s) deleted successfully`, count: result.count });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Delete Students");
    res.status(errorResponse.status).json(errorResponse);
  }
};
