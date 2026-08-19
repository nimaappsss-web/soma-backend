import { welcomeHtml, teacherInviteHtml, emailOtpHtml, parentInviteHtml, passwordResetHtml } from "./emailTemplates";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@gmail.com";

const sendViaSendGrid = async (
  to: string,
  subject: string,
  html: string,
) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not set");

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid API error (${res.status}): ${body}`);
  }
};

export const sendWelcomeEmail = async (to: string, name: string, frontendUrl?: string) => {
  await sendViaSendGrid(
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
  await sendViaSendGrid(
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

  await sendViaSendGrid(
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
    await sendViaSendGrid(
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
  await sendViaSendGrid(
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

  await sendViaSendGrid(
    to,
    "Reset Your Password — Soma",
    passwordResetHtml(name, resetUrl, frontend),
  );
};
