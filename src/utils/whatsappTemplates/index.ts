import path from "path";
import { buildInviteUrl } from "../inviteLink";

const ASSETS_DIR = path.join(process.cwd(), "src", "assets");

export const SOMA_BLACK_LOGO = process.env.SOMA_LOGO_URL || path.join(ASSETS_DIR, "somaBg.png");
export const SOMA_WHITE_LOGO = process.env.SOMA_LOGO_URL || path.join(ASSETS_DIR, "somaBg.png");

export const teacherInviteWhatsAppMessage = (
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
): string => {
  const acceptUrl = buildInviteUrl("/accept-invite", token, { email, phone }, frontendUrl);

  return `*${schoolName}* — You're Invited!

You've been invited to join *${schoolName}*.

Tap the link below to set up your account and get started:

${acceptUrl}

This invitation expires in *48 hours*.

— ${schoolName}`;
};

export const parentInviteWhatsAppMessage = (
  schoolName: string,
  parentName: string,
  studentName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
): string => {
  const acceptUrl = buildInviteUrl("/accept-parent-invite", token, { email, phone }, frontendUrl);

  return `*${schoolName}* — Welcome to ${schoolName}

Hi ${parentName},

Your child, *${studentName}*, has been registered at *${schoolName}*.

Tap the link below to set up your parent account:

${acceptUrl}

This invitation expires in *48 hours*.

— ${schoolName}`;
};

export const parentPhoneWhatsAppMessage = (
  schoolName: string,
  parentName: string,
  studentName: string,
): string => {
  return `*${schoolName}* — Welcome to ${schoolName}

Hi ${parentName},

Your child, *${studentName}*, has been registered at *${schoolName}*.

You can log in with your phone number to set up your parent account and follow your child's activities, attendance, and progress.

We'll send a verification code to this number when you log in.

— ${schoolName}`;
};

export const staffInviteWhatsAppMessage = (
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
  frontendUrl?: string,
): string => {
  const acceptUrl = buildInviteUrl("/accept-invite", token, { email, phone }, frontendUrl);

  return `*${schoolName}* — You're Invited!

You've been invited to join *${schoolName}*.

Tap the link below to set up your account:

${acceptUrl}

This invitation expires in *48 hours*.

— ${schoolName}`;
};

export const otpWhatsAppMessage = (schoolName: string, otp: string): string => {
  return `*${schoolName}* — Your verification code

Use the code below to continue:

*${otp}*

This code expires in *10 minutes*.
If you didn't request this, you can safely ignore this message.

— ${schoolName}`;
};

export const paymentReceivedMessage = (
  schoolName: string,
  parentName: string,
  childName: string,
  amount: number,
  receiptNo: string,
): string => {
  return `*${schoolName}* — Payment confirmed

Hi ${parentName},

We've received your payment of *₦${amount.toLocaleString()}* for *${childName}*.

Receipt no: *${receiptNo}*
This payment has been recorded for the current term.

— ${schoolName}`;
};

export const paymentPendingMessage = (
  schoolName: string,
  parentName: string,
  childName: string,
  amount: number,
): string => {
  return `*${schoolName}* — Payment submitted

Hi ${parentName},

Your payment of *₦${amount.toLocaleString()}* for *${childName}* has been submitted and is awaiting confirmation by the bursar.

We'll notify you once it's confirmed.

— ${schoolName}`;
};

export const paymentRejectedMessage = (
  schoolName: string,
  parentName: string,
  childName: string,
  amount: number,
  reason: string,
): string => {
  return `*${schoolName}* — Payment not accepted

Hi ${parentName},

Your payment of *₦${amount.toLocaleString()}* for *${childName}* was *not accepted*.

Reason: ${reason}

Please contact the school for assistance.

— ${schoolName}`;
};

export const feeReminderMessage = (
  schoolName: string,
  parentName: string,
  childNames: string[],
  outstanding: number,
): string => {
  return `*${schoolName}* — Fee payment reminder

Hi ${parentName},

You have outstanding school fees of *₦${outstanding.toLocaleString()}* for: ${childNames.join(", ")}.

Please complete payment at your earliest convenience.

— ${schoolName}`;
};