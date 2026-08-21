import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const classDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const classRecord = await prisma.class.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: {
        id: true,
        name: true,
        level: true,
        arm: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { students: true } },
        formTeachers: {
          select: { id: true, name: true, email: true, phone: true },
          take: 1,
        },
        classSubjects: {
          select: { subject: { select: { id: true, name: true, code: true } } },
          orderBy: { subject: { name: "asc" } },
        },
      },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    // A subject is "taken by the class" if it's explicitly assigned (ClassSubject)
    // or if the school has created exam/CA sessions for it in this class. The
    // second source keeps schools that haven't wired up assignments accurate.
    const sessionSubjects = await prisma.examSession.findMany({
      where: { schoolId: req.user.schoolId, classId: classRecord.id },
      select: { subject: { select: { id: true, name: true, code: true } } },
      distinct: ["subjectId"],
    });

    const subjectsById = new Map<string, { id: string; name: string; code?: string | null }>();
    for (const cs of classRecord.classSubjects) {
      subjectsById.set(cs.subject.id, cs.subject);
    }
    for (const ss of sessionSubjects) {
      if (!subjectsById.has(ss.subject.id)) subjectsById.set(ss.subject.id, ss.subject);
    }

    const subjects = [...subjectsById.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const { _count, formTeachers, classSubjects: _classSubjects, ...rest } = classRecord;

    res.json({
      class: {
        ...rest,
        studentCount: _count.students,
        formTeacher: formTeachers[0] || null,
        subjects,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Class Details");
    res.status(errorResponse.status).json(errorResponse);
  }
};
