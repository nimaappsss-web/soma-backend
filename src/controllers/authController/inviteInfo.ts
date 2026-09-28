import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const inviteInfo = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token: token as string },
    });

    if (!inviteToken) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "This invite has already been used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invite link has expired" });
    }

    const school = await prisma.school.findUnique({
      where: { id: inviteToken.schoolId },
      select: { name: true },
    });

    // The invite flow has no authenticated user yet, so the school-scoped
    // list endpoints (which sit behind authenticateToken) can't be used. Serve
    // the subjects/classes/assignments the registration form needs here, keyed
    // off the invite token itself.
    const [subjects, classes, assignments] = await Promise.all([
      prisma.subject.findMany({
        where: { schoolId: inviteToken.schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.class.findMany({
        where: { schoolId: inviteToken.schoolId },
        orderBy: [{ level: "asc" }, { arm: "asc" }],
        select: {
          id: true,
          name: true,
          level: true,
          arm: true,
          schoolType: true,
          formTeachers: { select: { id: true, name: true }, take: 1 },
        },
      }),
      prisma.class.findMany({
        where: { schoolId: inviteToken.schoolId },
        orderBy: [{ level: "asc" }, { arm: "asc" }],
        select: {
          id: true,
          name: true,
          classSubjects: { select: { subjectId: true } },
        },
      }),
    ]);

    res.json({
      email: inviteToken.invitedEmail,
      phone: inviteToken.invitedPhone,
      role: inviteToken.role,
      schoolId: inviteToken.schoolId,
      schoolName: school?.name || null,
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        arm: c.arm,
        schoolType: c.schoolType,
        formTeacher: c.formTeachers[0] || null,
      })),
      subjectAssignments: assignments.map((c) => ({
        classId: c.id,
        className: c.name,
        subjectIds: c.classSubjects.map((cs) => cs.subjectId),
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Info");
    res.status(errorResponse.status).json(errorResponse);
  }
};
