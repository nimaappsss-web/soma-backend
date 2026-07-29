import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, level, arm } = req.body;

    const classRecord = await prisma.class.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (name && name !== classRecord.name) {
      const existing = await prisma.class.findFirst({
        where: { schoolId: req.user.schoolId, name, id: { not: req.params.id } },
      });
      if (existing) {
        return res.status(400).json({ error: "A class with this name already exists" });
      }
    }

    const updated = await prisma.class.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(level !== undefined ? { level } : {}),
        ...(arm !== undefined ? { arm } : {}),
      },
      select: { id: true, name: true, level: true, arm: true, createdAt: true, updatedAt: true },
    });

    res.json({ class: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
