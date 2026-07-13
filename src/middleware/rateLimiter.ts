import rateLimit from "express-rate-limit";
import { AuthRequest } from "../types";

const standardMessage = (retryAfter: number) => ({
  error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
});

const defaults = { standardHeaders: true, legacyHeaders: false, validate: { xForwardedForHeader: false, default: true } as const };

export const loginLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip || "unknown",
  message: standardMessage(15 * 60),
});

export const sendOtpLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.phone || req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const verifyOtpLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.phone || req.body?.email || req.ip || "unknown",
  message: standardMessage(15 * 60),
});

export const forgotPasswordLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.email || req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const resetPasswordLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.token || req.ip || "unknown",
  message: standardMessage(15 * 60),
});

export const registerPrincipalLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const inviteTeacherLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req: AuthRequest) => req.user?.userId || req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const createStudentLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: (req: AuthRequest) => req.user?.userId || req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const bulkCreateStudentLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: AuthRequest) => req.user?.userId || req.ip || "unknown",
  message: standardMessage(60 * 60),
});

export const bulkInviteLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 2,
  keyGenerator: (req: AuthRequest) => req.user?.userId || req.ip || "unknown",
  message: standardMessage(60 * 60),
});
