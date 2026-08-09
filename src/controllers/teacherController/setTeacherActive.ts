import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const setTeacherActive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be a boolean" });
    }

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId: req.user.schoolId,
        role: { in: ["TEACHER", "BURSAR"] },
      },
      select: { id: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        approvalStatus: true,
        formClassId: true,
      },
    });

    res.json({
      message: active ? "Teacher activated" : "Teacher deactivated",
      teacher: updated,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Set Teacher Active");
    res.status(errorResponse.status).json(errorResponse);
  }
};