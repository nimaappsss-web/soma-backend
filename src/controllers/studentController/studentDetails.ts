import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        classId: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        imageUrl: true,
        parentName: true,
        parentPhone: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        syncStatus: true,
        syncedAt: true,
        version: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ student });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
