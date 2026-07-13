import { prisma } from "./prisma";
import { generateSecureToken } from "./tokens";
import { trySendParentEmail } from "./email";

export const ensureParentUser = async (
  schoolId: string,
  invitedBy: string,
  parentName: string,
  studentName: string,
  parentEmail?: string | null,
  parentPhone?: string | null,
) => {
  if (!parentEmail && !parentPhone) return null;

  if (parentEmail) {
    const existing = await prisma.user.findFirst({ where: { email: parentEmail } });
    if (existing) return existing;

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    const token = generateSecureToken();
    const frontendUrl = process.env.FRONTEND_URL || "https://soma-frontend-zeta.vercel.app";
    const link = `${frontendUrl}/parent/setup?token=${token}&email=${encodeURIComponent(parentEmail)}`;

    const invite = await prisma.inviteToken.create({
      data: {
        schoolId,
        invitedBy,
        token,
        invitedEmail: parentEmail,
        invitedName: parentName,
        role: "PARENT",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    // Fire-and-forget — don't block response
    trySendParentEmail(parentEmail, school?.name || "School", parentName, studentName, link).then(
      (result) => {
        if (!result.ok) {
          prisma.inviteToken.update({
            where: { id: invite.id },
            data: { emailFailed: true, emailError: result.error },
          }).catch(() => {});
        }
      },
    );
  } else if (parentPhone) {
    try {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
      const frontendUrl = process.env.FRONTEND_URL || "https://soma-frontend-zeta.vercel.app";
      // TODO: Send SMS with link to set up parent account
      console.log(`Parent ${parentPhone} registered at ${school?.name}. SMS integration pending.`);
    } catch (err: any) {
      console.error("Failed to notify parent via SMS:", err?.message || err);
    }
  }

  return null;
};
