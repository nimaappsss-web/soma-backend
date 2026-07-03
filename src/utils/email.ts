import nodemailer from "nodemailer";
import { welcomeHtml, teacherInviteHtml, emailOtpHtml } from "./emailTemplates";

let _transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!_transporter) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error("SENDGRID_API_KEY not set");
    }
    _transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: { user: "apikey", pass: apiKey },
    });
  }
  return _transporter;
};

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@gmail.com";

export const sendWelcomeEmail = async (to: string, name: string) => {
  return getTransporter().sendMail({
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
  return getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: `You're Invited to Join ${schoolName} on Nima`,
    html: teacherInviteHtml(teacherName, schoolName, otp),
  });
};

export const sendEmailOtp = async (
  to: string,
  name: string,
  otp: string,
) => {
  return getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Verify Your Email — Nima",
    html: emailOtpHtml(name, otp),
  });
};
