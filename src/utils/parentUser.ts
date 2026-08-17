import { prisma } from "./prisma";
import { generateSecureToken } from "./tokens";
import { trySendParentEmail } from "./email";
import { sendBrandedWhatsAppMessage } from "./whatsappClient";
import { cleanPhoneNumber, localPhoneNumber } from "./whatsapp";
import { parentInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "./whatsappTemplates";

export const ensureParentUser = async (
  schoolId: string,
  invitedBy: string,
  parentName: string,
  studentName: string,
  parentEmail?: string | null,
  parentPhone?: string | null,
) => {
  if (!parentEmail && !parentPhone) return null;

  const normalizedPhone = parentPhone ? localPhoneNumber(parentPhone) : undefined;

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });

  // Reuse an existing account (matched by email or phone) so multiple children
  // with the same contact all resolve to it via Student.parentPhone/parentEmail.
  const existing = await prisma.user.findFirst({
    where: parentEmail && normalizedPhone
      ? { OR: [{ email: parentEmail }, { phone: normalizedPhone }] }
      : parentEmail
        ? { email: parentEmail }
        : { phone: normalizedPhone },
  });
  if (existing) return existing;

  // Auto-create the parent account so the parent shows up immediately (not null).
  // No password yet — the parent verifies by logging in with a one-time code.
  const user = await prisma.user.create({
    data: {
      name: parentName || "Parent",
      email: parentEmail || undefined,
      phone: normalizedPhone || undefined,
      role: "PARENT",
      schoolId,
      active: true,
    },
  });

  const token = generateSecureToken();

  await prisma.inviteToken.create({
    data: {
      schoolId,
      invitedBy,
      token,
      invitedEmail: parentEmail || undefined,
      invitedPhone: normalizedPhone || undefined,
      invitedName: parentName,
      role: "PARENT",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  if (parentEmail) {
    // Fire-and-forget — don't block response. The template builds the link
    // (with email/phone prefill) from the token.
    trySendParentEmail(parentEmail, school?.name || "School", parentName, studentName, token, parentEmail, normalizedPhone).then(
      (result) => {
        if (!result.ok) {
          prisma.inviteToken
            .update({ where: { token }, data: { emailFailed: true, emailError: result.error } })
            .catch(() => {});
        }
      },
    );
  } else if (normalizedPhone) {
    const delivery = await sendBrandedWhatsAppMessage(
      cleanPhoneNumber(normalizedPhone),
      parentInviteWhatsAppMessage(school?.name || "School", parentName, studentName, token, undefined, normalizedPhone),
      { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
    );
    if (!delivery.ok) {
      console.warn(`[ensureParentUser] WhatsApp delivery failed for ${normalizedPhone}: ${delivery.error}`);
    }
  }

  return user;
};
