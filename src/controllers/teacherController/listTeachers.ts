import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listTeachers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const teacherWhere = {
      schoolId: req.user.schoolId,
      role: { in: ["TEACHER", "BURSAR"] },
    };

    const [activeTeachers, total, pendingInvites] = await Promise.all([
      prisma.user.findMany({
        where: teacherWhere,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          role: true,
          active: true,
          approvalStatus: true,
          formClassId: true,
          formClass: { select: { name: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: teacherWhere }),
      prisma.inviteToken.findMany({
        where: {
          schoolId: req.user.schoolId,
          role: { in: ["TEACHER", "BURSAR"] },
          usedAt: null,
          expiresAt: { gt: new Date() },
          invitedEmail: { not: null },
        },
        select: {
          id: true,
          token: true,
          invitedEmail: true,
          role: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const now = Date.now();

    res.json({
      teachers: activeTeachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        image: t.image,
        role: t.role,
        active: t.active,
        approvalStatus: t.approvalStatus,
        status: "active",
        formClassId: t.formClassId,
        formClass: t.formClass?.name || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pendingInvites: pendingInvites.map((i) => ({
        id: i.id,
        email: i.invitedEmail,
        role: i.role,
        status: "pending",
        invitedAt: i.createdAt,
        expiresAt: i.expiresAt,
        expiresIn: Math.max(0, Math.floor((i.expiresAt.getTime() - now) / 1000)),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Teachers");
    res.status(errorResponse.status).json(errorResponse);
  }
};
