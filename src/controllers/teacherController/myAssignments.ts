import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const myAssignments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: req.user.userId,
        type: "subject",
      },
      select: {
        id: true,
        subject: { select: { id: true, name: true, code: true } },
        classes: {
          select: {
            class: { select: { id: true, name: true, level: true, arm: true } },
          },
        },
      },
    });

    res.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        subject: a.subject,
        classes: a.classes.map((c) => c.class),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "My Assignments");
    res.status(errorResponse.status).json(errorResponse);
  }
};
