import { prisma } from "./prisma";
import { generateSecureToken } from "./tokens";
import { trySendParentEmail } from "./email";
import { sendBrandedWhatsAppMessage } from "./whatsappClient";
import { cleanPhoneNumber, localPhoneNumber } from "./whatsapp";
import { parentInviteWhatsAppMessage, SOMA_WHITE_LOGO } from "./whatsappTemplates";
import { normalizePersonName } from "./personName";

export const ensureParentUser = async (
  schoolId: string,
  invitedBy: string,
  parentName: string,
  studentName: string,
  parentEmail?: string | null,
  parentPhone?: string | null,
) => {
  if (!parentEmail && !parentPhone) return null;

  const cleanName = normalizePersonName(parentName) || "Parent";
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

  // Auto-create the parent account so the parent shows up immediately (not null).
  // No password yet — the parent verifies by logging in with a one-time code.
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        name: cleanName,
        email: parentEmail || undefined,
        phone: normalizedPhone || undefined,
        role: "PARENT",
        schoolId,
        active: true,
      },
    }));

  // Reuse a still-pending invite for this parent (same contact) instead of
  // stacking duplicate tokens when a second child shares the email/phone.
  const existingInvite = await prisma.inviteToken.findFirst({
    where: {
      schoolId,
      role: "PARENT",
      usedAt: null,
      OR: [
        ...(parentEmail ? [{ invitedEmail: parentEmail }] : []),
        ...(normalizedPhone ? [{ invitedPhone: normalizedPhone }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const emailChanged =
    parentEmail != null &&
    parentEmail !== undefined &&
    existingInvite?.invitedEmail !== parentEmail;

  let invite = existingInvite;
  let inviteCreated = false;

  if (!invite) {
    invite = await prisma.inviteToken.create({
      data: {
        schoolId,
        invitedBy,
        token: generateSecureToken(),
        invitedEmail: parentEmail || undefined,
        invitedPhone: normalizedPhone || undefined,
        invitedName: cleanName,
        role: "PARENT",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    inviteCreated = true;
  } else if (emailChanged) {
    invite = await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { invitedEmail: parentEmail, invitedName: cleanName },
    });
  }

  // Deliver the invite when it is brand new, the email address just changed,
  // or a previous delivery attempt failed — otherwise avoid re-sending on
  // every call (e.g. repeated student edits).
  const shouldSend = inviteCreated || invite.emailFailed || emailChanged;

  if (parentEmail && shouldSend) {
    // Fire-and-forget — don't block response. The template builds the link
    // (with email/phone prefill) from the token.
    trySendParentEmail(parentEmail, school?.name || "School", cleanName, studentName, invite.token, parentEmail, normalizedPhone).then(
      (result) => {
        if (!result.ok) {
          prisma.inviteToken
            .update({ where: { id: invite.id }, data: { emailFailed: true, emailError: result.error } })
            .catch(() => {});
        }
      },
    );
  } else if (normalizedPhone && shouldSend) {
    const delivery = await sendBrandedWhatsAppMessage(
      cleanPhoneNumber(normalizedPhone),
      parentInviteWhatsAppMessage(school?.name || "School", cleanName, studentName, invite.token, undefined, normalizedPhone),
      { logoUrl: SOMA_WHITE_LOGO, sendLogo: true },
    );
    if (!delivery.ok) {
      console.warn(`[ensureParentUser] WhatsApp delivery failed for ${normalizedPhone}: ${delivery.error}`);
    }
  }

  return user;
};
