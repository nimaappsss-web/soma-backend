import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { computeSchoolSync } from "./schoolSync";

export const getUserDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        employmentDate: true,
        formClassId: true,
        active: true,
        approvalStatus: true,
        emailVerified: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true,
        school: { select: { id: true, name: true, logo: true, state: true, active: true } },
        formClass: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [sessionCount, lastActivity, assignmentCount] = await Promise.all([
      prisma.session.count({ where: { userId: id } }),
      prisma.session.findFirst({
        where: { userId: id },
        orderBy: { lastActivityAt: "desc" },
        select: { lastActivityAt: true },
      }),
      prisma.teacherAssignment.count({ where: { teacherId: id } }),
    ]);

    const sync = user.schoolId
      ? (await computeSchoolSync([user.schoolId])).get(user.schoolId)
      : undefined;

    res.json({
      user,
      stats: {
        sessions: sessionCount,
        assignments: assignmentCount,
        lastActivityAt: lastActivity?.lastActivityAt ?? null,
      },
      sync: user.schoolId ? sync ?? { lastSyncAt: null, syncStatus: "silent" as const } : null,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Get User Detail");
    res.status(errorResponse.status).json(errorResponse);
  }
};