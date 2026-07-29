import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, code, active } = req.body;

    const subject = await prisma.subject.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    if (name && name !== subject.name) {
      const existing = await prisma.subject.findFirst({
        where: { schoolId: req.user.schoolId, name, id: { not: req.params.id } },
      });
      if (existing) {
        return res.status(400).json({ error: "A subject with this name already exists" });
      }
    }

    const updated = await prisma.subject.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code: code || null } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      select: { id: true, name: true, code: true, active: true, createdAt: true, updatedAt: true },
    });

    res.json({ subject: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Subject");
    res.status(errorResponse.status).json(errorResponse);
  }
};
