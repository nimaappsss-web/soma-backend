import dns from "dns";
import nodemailer from "nodemailer";
import { welcomeHtml, teacherInviteHtml, emailOtpHtml } from "./emailTemplates";

let _transporter: nodemailer.Transporter | null = null;

const getTransporter = async () => {
  if (!_transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      console.error("GMAIL_USER or GMAIL_APP_PASSWORD not set");
      return _transporter;
    }
    const addresses = await dns.promises.resolve4("smtp.gmail.com");
    _transporter = nodemailer.createTransport({
      host: addresses[0],
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { servername: "smtp.gmail.com" },
    });
  }
  return _transporter;
};

const FROM_EMAIL = process.env.GMAIL_USER || "noreply@gmail.com";

export const sendWelcomeEmail = async (to: string, name: string) => {
  const transporter = await getTransporter();
  if (!transporter) throw new Error("Email transporter not available");
  return transporter.sendMail({
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
  const transporter = await getTransporter();
  if (!transporter) throw new Error("Email transporter not available");
  return transporter.sendMail({
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
  const transporter = await getTransporter();
  if (!transporter) throw new Error("Email transporter not available");
  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Verify Your Email — Nima",
    html: emailOtpHtml(name, otp),
  });
};
