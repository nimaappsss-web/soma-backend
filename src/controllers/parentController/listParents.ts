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
          invitedPhone: true,
          invitedName: true,
          emailFailed: true,
          emailError: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Parents are now auto-created when a student is added, so a pending invite
    // only lingers if the parent hasn't set up a password yet. Skip invites that
    // already have a matching active user to avoid duplicates.
    const activeEmails = new Set(activeParents.map((p) => p.email).filter(Boolean));
    const activePhones = new Set(activeParents.map((p) => p.phone).filter(Boolean));
    const unresolvedInvites = pendingInvites.filter((i) => {
      if (i.invitedEmail && activeEmails.has(i.invitedEmail)) return false;
      if (i.invitedPhone && activePhones.has(i.invitedPhone)) return false;
      return true;
    });

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

    // Fetch linked students for unresolved pending invites (by email or phone)
    const inviteEmails = unresolvedInvites.map((i) => i.invitedEmail).filter(Boolean) as string[];
    const invitePhones = unresolvedInvites.map((i) => i.invitedPhone).filter(Boolean) as string[];
    const inviteStudents = inviteEmails.length > 0 || invitePhones.length > 0
      ? await prisma.student.findMany({
          where: {
            schoolId,
            OR: [
              ...(inviteEmails.length > 0 ? [{ parentEmail: { in: inviteEmails } }] : []),
              ...(invitePhones.length > 0 ? [{ parentPhone: { in: invitePhones } }] : []),
            ],
          },
          select: { id: true, parentEmail: true, parentPhone: true, name: true, admissionNo: true },
        })
      : [];
    const studentsByInviteEmail = new Map<string, { id: string; name: string; admissionNo: string }[]>();
    const studentsByInvitePhone = new Map<string, { id: string; name: string; admissionNo: string }[]>();
    for (const s of inviteStudents) {
      const entry = { id: s.id, name: s.name, admissionNo: s.admissionNo };
      if (s.parentEmail) {
        const list = studentsByInviteEmail.get(s.parentEmail) || [];
        list.push(entry);
        studentsByInviteEmail.set(s.parentEmail, list);
      }
      if (s.parentPhone) {
        const list = studentsByInvitePhone.get(s.parentPhone) || [];
        list.push(entry);
        studentsByInvitePhone.set(s.parentPhone, list);
      }
    }

    const now = Date.now();

    // Build a lookup of unused invites by email/phone so auto-created parents
    // who haven't set up a password yet can still resend their invite link.
    const inviteByEmail = new Map<string, string>();
    const inviteByPhone = new Map<string, string>();
    for (const i of pendingInvites) {
      if (i.invitedEmail && !inviteByEmail.has(i.invitedEmail)) inviteByEmail.set(i.invitedEmail, i.id);
      if (i.invitedPhone && !inviteByPhone.has(i.invitedPhone)) inviteByPhone.set(i.invitedPhone, i.id);
    }

    const activeMapped = activeParents.map((p) => {
      const inviteId =
        !p.passwordHash && (p.email ? inviteByEmail.get(p.email) : p.phone ? inviteByPhone.get(p.phone) : undefined);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        emailVerified: p.emailVerified,
        hasAccount: !!p.passwordHash,
        inviteId: inviteId || undefined,
        status: "active" as const,
        students: (p.email ? studentsByEmail.get(p.email) : studentsByPhone.get(p.phone || "")) || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    const pendingMapped = unresolvedInvites.map((i) => ({
      id: i.id,
      name: i.invitedName || "",
      email: i.invitedEmail,
      phone: i.invitedPhone,
      emailVerified: false,
      hasAccount: false,
      status: "pending" as const,
      students: (i.invitedEmail ? studentsByInviteEmail.get(i.invitedEmail) : studentsByInvitePhone.get(i.invitedPhone || "")) || [],
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
