import { Resend } from "resend";
import { welcomeHtml, teacherInviteHtml, emailOtpHtml, parentInviteHtml, passwordResetHtml } from "./emailTemplates";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@checksoma.com";

const getResend = () => {
  if (!RESEND_API_KEY) {
    throw new Error(
      "Resend not configured — set RESEND_API_KEY to enable email sending",
    );
  }
  return new Resend(RESEND_API_KEY);
};

const sendViaResend = async (
  to: string,
  subject: string,
  html: string,
) => {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
};

export const sendWelcomeEmail = async (to: string, name: string, frontendUrl?: string) => {
  await sendViaResend(
    to,
    "Welcome to Nima — Verify Your Account",
    welcomeHtml(name, frontendUrl),
  );
};

export const sendTeacherInviteEmail = async (
  to: string,
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
) => {
  await sendViaResend(
    to,
    `You're Invited to Join ${schoolName} on Nima`,
    teacherInviteHtml(schoolName, token, email, phone, frontendUrl),
  );
};

export const sendParentInviteEmail = async (
  to: string,
  schoolName: string,
  parentName: string,
  studentName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
) => {
  if (process.env.DISABLE_EMAILS === "true") return;

  await sendViaResend(
    to,
    `Your child has been registered at ${schoolName}`,
    parentInviteHtml(schoolName, parentName, studentName, token, email, phone, frontendUrl),
  );
};

export const trySendParentEmail = async (
  to: string,
  schoolName: string,
  parentName: string,
  studentName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
): Promise<{ ok: boolean; error?: string }> => {
  if (process.env.DISABLE_EMAILS === "true") return { ok: true };

  try {
    await sendViaResend(
      to,
      `Your child has been registered at ${schoolName}`,
      parentInviteHtml(schoolName, parentName, studentName, token, email, phone, frontendUrl),
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown email error" };
  }
};

export const sendEmailOtp = async (
  to: string,
  name: string,
  otp: string,
  frontendUrl?: string,
) => {
  await sendViaResend(
    to,
    "Verify Your Email — Nima",
    emailOtpHtml(name, otp, frontendUrl),
  );
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string,
  frontendUrl?: string,
) => {
  if (process.env.DISABLE_EMAILS === "true") return;

  const frontend = (frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const resetUrl = `${frontend}/reset-password?token=${encodeURIComponent(token)}`;

  await sendViaResend(
    to,
    "Reset Your Password — Soma",
    passwordResetHtml(name, resetUrl, frontend),
  );
};
