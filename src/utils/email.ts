import { welcomeHtml, teacherInviteHtml, emailOtpHtml } from "./emailTemplates";

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

export const sendWelcomeEmail = async (to: string, name: string) => {
  await sendViaSendGrid(
    to,
    "Welcome to Nima — Verify Your Account",
    welcomeHtml(name),
  );
};

export const sendTeacherInviteEmail = async (
  to: string,
  teacherName: string,
  schoolName: string,
  otp: string,
) => {
  await sendViaSendGrid(
    to,
    `You're Invited to Join ${schoolName} on Nima`,
    teacherInviteHtml(teacherName, schoolName, otp),
  );
};

export const sendEmailOtp = async (
  to: string,
  name: string,
  otp: string,
) => {
  await sendViaSendGrid(
    to,
    "Verify Your Email — Nima",
    emailOtpHtml(name, otp),
  );
};
