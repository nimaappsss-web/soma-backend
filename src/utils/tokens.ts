import crypto from "crypto";

// How long a login/verification OTP stays valid, in milliseconds.
export const OTP_TTL_MS = 15 * 60 * 1000;

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateInviteToken = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "NMA-";
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
