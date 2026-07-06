import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { hashPassword, validatePassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

export const completeRegistration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, password, assignments } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { school: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.passwordHash) {
      return res.status(400).json({ error: "Registration already completed" });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { name, passwordHash },
    });

    if (assignments && Array.isArray(assignments)) {
      for (const assignment of assignments) {
        const { subjectId, classIds } = assignment;

        if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
          continue;
        }

        const teacherAssignment = await prisma.teacherAssignment.create({
          data: {
            teacherId: user.id,
            schoolId: user.schoolId!,
            type: subjectId ? "subject" : "form",
            subjectId: subjectId || null,
          },
        });

        const classLinks = classIds.map((classId: string) => ({
          assignmentId: teacherAssignment.id,
          classId,
        }));

        await prisma.teacherAssignmentClass.createMany({
          data: classLinks,
        });
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        school: true,
        assignments: {
          include: { classes: true },
        },
      },
    });

    res.json({
      message: "Registration completed successfully",
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        phone: updatedUser!.phone,
        role: updatedUser!.role,
        schoolId: updatedUser!.schoolId,
        schoolName: updatedUser!.school?.name || null,
        assignments: updatedUser!.assignments.map((a) => ({
          id: a.id,
          type: a.type,
          subjectId: a.subjectId,
          classes: a.classes.map((c) => ({
            classId: c.classId,
          })),
        })),
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Complete Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
