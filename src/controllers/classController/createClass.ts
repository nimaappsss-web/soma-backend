import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, level, arm } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: "Name and level are required" });
    }

    const existing = await prisma.class.findFirst({
      where: { schoolId: req.user.schoolId, name },
    });

    if (existing) {
      return res.status(400).json({ error: "Class already exists" });
    }

    const newClass = await prisma.class.create({
      data: {
        schoolId: req.user.schoolId,
        name,
        level,
        arm: arm || "",
      },
    });

    res.status(201).json({ class: newClass });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
