import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listTeachers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const activeTeachers = await prisma.user.findMany({
      where: {
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
        formClassId: true,
        formClass: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingInvites = await prisma.inviteToken.findMany({
      where: {
        schoolId: req.user.schoolId,
        usedAt: null,
        expiresAt: { gt: new Date() },
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
    });

    const now = Date.now();

    res.json({
      teachers: activeTeachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        role: t.role,
        active: t.active,
        status: "active",
        formClassId: t.formClassId,
        formClass: t.formClass?.name || null,
        createdAt: t.createdAt,
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
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Teachers");
    res.status(errorResponse.status).json(errorResponse);
  }
};
