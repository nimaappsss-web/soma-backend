import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listParents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const schoolId = req.user.schoolId;

    const parentWhere = { schoolId, role: "PARENT" as const };

    const [activeParents, pendingInvites] = await Promise.all([
      prisma.user.findMany({
        where: parentWhere,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.inviteToken.findMany({
        where: {
          schoolId,
          role: "PARENT",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          token: true,
          invitedEmail: true,
          invitedName: true,
          emailFailed: true,
          emailError: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Pending invites and active users are disjoint sets (invite-only, no user created upfront)

    // Fetch linked students for active parents (by email or phone)
    const parentEmails = activeParents.map((p) => p.email).filter(Boolean) as string[];
    const parentPhones = activeParents.map((p) => p.phone).filter(Boolean) as string[];

    const linkedStudents = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          ...(parentEmails.length > 0 ? [{ parentEmail: { in: parentEmails } }] : []),
          ...(parentPhones.length > 0 ? [{ parentPhone: { in: parentPhones } }] : []),
        ],
      },
      select: { id: true, parentEmail: true, parentPhone: true, name: true, admissionNo: true },
    });

    // Build parentEmail -> student objects map
    const studentsByEmail = new Map<string, { id: string; name: string; admissionNo: string }[]>();
    const studentsByPhone = new Map<string, { id: string; name: string; admissionNo: string }[]>();
    for (const s of linkedStudents) {
      const entry = { id: s.id, name: s.name, admissionNo: s.admissionNo };
      if (s.parentEmail) {
        const list = studentsByEmail.get(s.parentEmail) || [];
        list.push(entry);
        studentsByEmail.set(s.parentEmail, list);
      }
      if (s.parentPhone) {
        const list = studentsByPhone.get(s.parentPhone) || [];
        list.push(entry);
        studentsByPhone.set(s.parentPhone, list);
      }
    }

    // Fetch linked students for pending invites (by invitedEmail)
    const inviteEmails = pendingInvites.map((i) => i.invitedEmail).filter(Boolean) as string[];
    const inviteStudents = inviteEmails.length > 0
      ? await prisma.student.findMany({
          where: { schoolId, parentEmail: { in: inviteEmails } },
          select: { id: true, parentEmail: true, name: true, admissionNo: true },
        })
      : [];
    const studentsByInviteEmail = new Map<string, { id: string; name: string; admissionNo: string }[]>();
    for (const s of inviteStudents) {
      if (s.parentEmail) {
        const list = studentsByInviteEmail.get(s.parentEmail) || [];
        list.push({ id: s.id, name: s.name, admissionNo: s.admissionNo });
        studentsByInviteEmail.set(s.parentEmail, list);
      }
    }

    const now = Date.now();

    const activeMapped = activeParents.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      emailVerified: p.emailVerified,
      hasAccount: !!p.passwordHash,
      status: "active" as const,
      students: (p.email ? studentsByEmail.get(p.email) : studentsByPhone.get(p.phone || "")) || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const pendingMapped = pendingInvites.map((i) => ({
      id: i.id,
      name: i.invitedName || "",
      email: i.invitedEmail,
      phone: null,
      emailVerified: false,
      hasAccount: false,
      status: "pending" as const,
      students: studentsByInviteEmail.get(i.invitedEmail || "") || [],
      invitedAt: i.createdAt,
      expiresAt: i.expiresAt,
      expiresIn: Math.max(0, Math.floor((i.expiresAt.getTime() - now) / 1000)),
      emailFailed: i.emailFailed,
      emailError: i.emailError,
    }));

    const all = [...activeMapped, ...pendingMapped];
    const total = all.length;
    const skip = (page - 1) * limit;
    const paged = all.slice(skip, skip + limit);

    res.json({
      parents: paged,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Parents");
    res.status(errorResponse.status).json(errorResponse);
  }
};
