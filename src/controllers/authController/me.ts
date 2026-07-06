import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        school: true,
        assignments: {
          include: { classes: true, subject: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      needsRegistration: !user.passwordHash,
      schoolId: user.schoolId,
      school: user.school ? {
        id: user.school.id,
        name: user.school.name,
        logo: user.school.logo,
        state: user.school.state,
        lga: user.school.lga,
        schoolType: user.school.schoolType,
      } : null,
      assignments: user.assignments.map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject ? { id: a.subject.id, name: a.subject.name } : null,
        classes: a.classes.map((c) => ({
          classId: c.classId,
        })),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get User Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};
