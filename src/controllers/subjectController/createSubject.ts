import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Subject name is required" });
    }

    const existing = await prisma.subject.findFirst({
      where: { schoolId: req.user.schoolId, name },
    });

    if (existing) {
      return res.status(400).json({ error: "Subject already exists" });
    }

    const subject = await prisma.subject.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        code: code || null,
      },
    });

    res.status(201).json({ subject });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Subject");
    res.status(errorResponse.status).json(errorResponse);
  }
};
