import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { name, email, phone, role, active, formClassId, updatedAt } = req.body;

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId: req.user.schoolId,
        role: { in: ["TEACHER", "BURSAR"] },
      },
      select: { id: true, updatedAt: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (updatedAt) {
      const clientTime = new Date(updatedAt).getTime();
      const serverTime = teacher.updatedAt.getTime();
      if (serverTime > clientTime) {
        return res.status(409).json({
          error: "Conflict",
          message: "This record was modified by another device. Refresh and try again.",
          serverUpdatedAt: teacher.updatedAt,
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(formClassId !== undefined ? { formClassId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        formClassId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ teacher: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
