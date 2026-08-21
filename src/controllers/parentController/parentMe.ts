import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { studentIdsForParent } from "../../utils/parentScoping";

export const parentMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        schoolId: true,
        image: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const studentIds = await studentIdsForParent(req.user.schoolId, req.user.userId);

    const students = studentIds.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: studentIds } },
          include: {
            class: { select: { id: true, name: true } },
          },
        })
      : [];

    const studentsWithDetails = await Promise.all(
      students.map(async (s) => {
        let teacherName: string | undefined;
        if (s.class) {
          const formTeacher = await prisma.user.findFirst({
            where: { schoolId: req.user!.schoolId, formClassId: s.class.id },
            select: { name: true },
          });
          teacherName = formTeacher?.name;
        }
        return {
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo,
          classId: s.classId,
          className: s.class?.name ?? null,
          teacherName: teacherName ?? null,
        };
      }),
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      image: user.image,
      hasAccount: true,
      status: "active" as const,
      schoolId: user.schoolId,
      students: studentsWithDetails,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Parent Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};