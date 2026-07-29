import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      include: {
        class: { select: { id: true, name: true, formTeachers: { select: { id: true, name: true, email: true, phone: true }, take: 1 } } },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const formTeacher = student.class.formTeachers[0] || null;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        classId: student.classId,
        className: student.class.name,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        address: student.address,
        imageUrl: student.imageUrl,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        status: student.status,
        createdAt: student.createdAt,
        currentClassTeacher: formTeacher ? {
          name: formTeacher.name,
          email: formTeacher.email,
          phone: formTeacher.phone || null,
        } : null,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
