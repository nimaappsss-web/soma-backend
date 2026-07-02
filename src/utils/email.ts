import { Resend } from "resend";
import { welcomeHtml, teacherInviteHtml } from "./emailTemplates";

let _resend: Resend | null = null;

const getResend = () => {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
};

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Nima <onboarding@resend.dev>";

export const sendWelcomeEmail = async (to: string, name: string) => {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Nima — Verify Your Account",
    html: welcomeHtml(name),
  });
};

export const sendTeacherInviteEmail = async (
  to: string,
  teacherName: string,
  schoolName: string,
  otp: string,
) => {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're Invited to Join ${schoolName} on Nima`,
    html: teacherInviteHtml(teacherName, schoolName, otp),
  });
};
