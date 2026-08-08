import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const teacherDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId: req.user.schoolId,
        role: { in: ["TEACHER", "BURSAR"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        approvalStatus: true,
        formClassId: true,
        formClass: { select: { id: true, name: true, level: true, arm: true } },
        createdAt: true,
        updatedAt: true,
        assignments: {
          where: { type: "subject" },
          select: {
            id: true,
            subject: { select: { id: true, name: true, code: true } },
            classes: {
              select: {
                class: { select: { id: true, name: true, level: true, arm: true } },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      role: teacher.role,
      active: teacher.active,
      approvalStatus: teacher.approvalStatus,
      formClassId: teacher.formClassId,
      formClass: teacher.formClass || null,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      assignments: teacher.assignments.map((a) => ({
        id: a.id,
        subject: a.subject,
        classes: a.classes.map((c) => c.class),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Teacher Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
