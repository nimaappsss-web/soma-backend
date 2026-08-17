import path from "path";
import { buildInviteUrl } from "../inviteLink";

const ASSETS_DIR = path.join(process.cwd(), "src", "assets");

export const SOMA_BLACK_LOGO = path.join(ASSETS_DIR, "somaBg.png");
export const SOMA_WHITE_LOGO = path.join(ASSETS_DIR, "somaBg.png");

export const BRAND_NAME = "Soma";

export const teacherInviteWhatsAppMessage = (
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
): string => {
  const acceptUrl = buildInviteUrl("/accept-invite", token, { email, phone });

  return `*${BRAND_NAME}* — You're Invited!

You've been invited to join *${schoolName}*.

Tap the link below to set up your account and get started:

${acceptUrl}

This invitation expires in *48 hours*.

— ${BRAND_NAME} School Management`;
};

export const parentInviteWhatsAppMessage = (
  schoolName: string,
  parentName: string,
  studentName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
): string => {
  const acceptUrl = buildInviteUrl("/accept-parent-invite", token, { email, phone });

  return `*${BRAND_NAME}* — Welcome to ${schoolName}

Hi ${parentName},

Your child, *${studentName}*, has been registered at *${schoolName}*.

Tap the link below to set up your parent account:

${acceptUrl}

This invitation expires in *48 hours*.

— ${BRAND_NAME} School Management`;
};

export const parentPhoneWhatsAppMessage = (
  schoolName: string,
  parentName: string,
  studentName: string,
): string => {
  return `*${BRAND_NAME}* — Welcome to ${schoolName}

Hi ${parentName},

Your child, *${studentName}*, has been registered at *${schoolName}*.

You can log in with your phone number to set up your parent account and follow your child's activities, attendance, and progress.

We'll send a verification code to this number when you log in.

— ${BRAND_NAME} School Management`;
};

export const staffInviteWhatsAppMessage = (
  schoolName: string,
  token: string,
  email?: string | null,
  phone?: string | null,
): string => {
  const acceptUrl = buildInviteUrl("/accept-invite", token, { email, phone });

  return `*${BRAND_NAME}* — You're Invited!

You've been invited to join *${schoolName}*.

Tap the link below to set up your account:

${acceptUrl}

This invitation expires in *48 hours*.

— ${BRAND_NAME} School Management`;
};

export const otpWhatsAppMessage = (otp: string): string => {
  return `*${BRAND_NAME}* — Your verification code

Use the code below to continue:

*${otp}*

This code expires in *10 minutes*.
If you didn't request this, you can safely ignore this message.

— ${BRAND_NAME} School Management`;
};

export const paymentReceivedMessage = (
  parentName: string,
  childName: string,
  amount: number,
  receiptNo: string,
): string => {
  return `*${BRAND_NAME}* — Payment confirmed

Hi ${parentName},

We've received your payment of *₦${amount.toLocaleString()}* for *${childName}*.

Receipt no: *${receiptNo}*
This payment has been recorded for the current term.

— ${BRAND_NAME} School Management`;
};

export const paymentPendingMessage = (
  parentName: string,
  childName: string,
  amount: number,
): string => {
  return `*${BRAND_NAME}* — Payment submitted

Hi ${parentName},

Your payment of *₦${amount.toLocaleString()}* for *${childName}* has been submitted and is awaiting confirmation by the bursar.

We'll notify you once it's confirmed.

— ${BRAND_NAME} School Management`;
};

export const paymentRejectedMessage = (
  parentName: string,
  childName: string,
  amount: number,
  reason: string,
): string => {
  return `*${BRAND_NAME}* — Payment not accepted

Hi ${parentName},

Your payment of *₦${amount.toLocaleString()}* for *${childName}* was *not accepted*.

Reason: ${reason}

Please contact the school for assistance.

— ${BRAND_NAME} School Management`;
};

export const feeReminderMessage = (
  parentName: string,
  childNames: string[],
  outstanding: number,
): string => {
  return `*${BRAND_NAME}* — Fee payment reminder

Hi ${parentName},

You have outstanding school fees of *₦${outstanding.toLocaleString()}* for: ${childNames.join(", ")}.

Please complete payment at your earliest convenience.

— ${BRAND_NAME} School Management`;
};