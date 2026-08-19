import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendBrandedWhatsAppMessage } from "../../utils/whatsappClient";
import { cleanPhoneNumber } from "../../utils/whatsapp";
import { teacherInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "../../utils/whatsappTemplates";

export const bulkInviteTeachers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user;

    if (!["PRINCIPAL", "SCHOOL_ADMIN"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Only principals and school admins can invite teachers" });
    }

    if (!user.schoolId) {
      return res.status(400).json({ error: "No school registered yet" });
    }

    const { teachers } = req.body;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ error: "Teachers array is required" });
    }

    if (teachers.length > 100) {
      return res.status(400).json({ error: "Maximum 100 teachers per batch" });
    }

    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    // --- Validate emails upfront ---
    const errors: any[] = [];
    const validTeachers = teachers.filter((t) => {
      if (!t.teacherEmail) {
        errors.push({ error: "Email is required" });
        return false;
      }
      if (!validateEmail(t.teacherEmail)) {
        errors.push({ email: t.teacherEmail, error: "Invalid email format" });
        return false;
      }
      return true;
    });

    if (validTeachers.length === 0) {
      return res.status(400).json({ error: "No valid teacher emails", errors });
    }

    const emails = validTeachers.map((t) => t.teacherEmail);

    // --- Batch check existing users and pending invites (2 parallel queries) ---
    const [existingUsers, pendingInvites] = await Promise.all([
      prisma.user.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      }),
      prisma.inviteToken.findMany({
        where: {
          schoolId: user.schoolId,
          invitedEmail: { in: emails },
          role: "TEACHER",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { invitedEmail: true },
      }),
    ]);

    const existingEmailSet = new Set(existingUsers.map((u) => u.email));
    const pendingEmailSet = new Set(pendingInvites.map((i) => i.invitedEmail).filter(Boolean));

    // --- Build invite data for valid, non-duplicate emails ---
    const now = Date.now();

    const inviteData = validTeachers
      .filter((t) => {
        if (existingEmailSet.has(t.teacherEmail)) {
          errors.push({ email: t.teacherEmail, error: "A user with this email already exists in the system" });
          return false;
        }
        if (pendingEmailSet.has(t.teacherEmail)) {
          errors.push({ email: t.teacherEmail, error: "A pending invite already exists for this email" });
          return false;
        }
        return true;
      })
      .map((t) => ({
        schoolId: user.schoolId!,
        invitedBy: user.userId,
        token: generateSecureToken(),
        invitedEmail: t.teacherEmail,
        invitedName: "Teacher",
        role: t.role || "TEACHER",
        phone: t.teacherPhone || null,
        expiresAt: new Date(now + 48 * 60 * 60 * 1000),
      }));

    if (inviteData.length === 0) {
      return res.status(400).json({ error: "All emails already have users or pending invites", errors });
    }

    // --- Bulk create all invite tokens (1 query) ---
    await prisma.inviteToken.createMany({ data: inviteData });

    // --- Fetch back to get IDs (needed for response) ---
    const createdInvites = await prisma.inviteToken.findMany({
      where: {
        schoolId: user.schoolId,
        token: { in: inviteData.map((i) => i.token) },
      },
      select: { id: true, token: true, invitedEmail: true, role: true, expiresAt: true },
    });

    const inviteByToken = new Map(inviteData.map((i) => [i.token, i]));
    const frontendUrl = getFrontendUrl(req);

    // --- Fire all emails + WhatsApp concurrently (fire-and-forget errors) ---
    Promise.allSettled(
      createdInvites.map((inv) => {
        const row = inviteByToken.get(inv.token);
        return sendTeacherInviteEmail(inv.invitedEmail!, school.name, inv.token, inv.invitedEmail!, row?.phone, frontendUrl).catch((err) => {
          console.error("Failed to send invite email:", err?.message || err);
        }).then(async () => {
          if (row?.phone) {
            const delivery = await sendBrandedWhatsAppMessage(
              cleanPhoneNumber(row.phone),
              teacherInviteWhatsAppMessage(school.name, inv.token, inv.invitedEmail!, row.phone, frontendUrl),
              { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
            );
            if (!delivery.ok) {
              console.warn(`[bulkInviteTeachers] WhatsApp delivery failed for ${row.phone}: ${delivery.error}`);
            }
          }
        });
      }),
    );

    res.status(201).json({
      message: `Created ${createdInvites.length} invite(s)`,
      invites: createdInvites.map((inv) => ({
        teacherEmail: inv.invitedEmail,
        role: inv.role,
        expiresAt: inv.expiresAt,
      })),
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: teachers.length,
        successful: createdInvites.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Invite Teachers");
    res.status(errorResponse.status).json(errorResponse);
  }
};
