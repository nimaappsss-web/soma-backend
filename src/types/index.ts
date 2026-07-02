import { Request } from "express";
import { JwtPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface RegisterSchoolDto {
  schoolName: string;
  state: string;
  lga: string;
  schoolType: "PRIMARY" | "SECONDARY" | "BOTH";
  principalName: string;
  principalEmail?: string;
  principalPhone: string;
  password: string;
  imageUrl?: string;
  logoUrl?: string;
}

export interface RegisterPrincipalDto {
  principalName: string;
  principalEmail?: string;
  principalPhone: string;
  password: string;
  imageUrl?: string;
}

export interface UnifiedLoginDto {
  identifier: string;
  password?: string;
  deviceId: string;
  deviceName: string;
}

export interface SendOTPDto {
  phone: string;
}

export interface VerifyOTPDto {
  phone: string;
  code: string;
  deviceId: string;
  deviceName: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface InviteTeacherDto {
  teacherName: string;
  teacherPhone: string;
  role?: "TEACHER" | "BURSAR";
}

export interface AcceptInviteDto {
  token: string;
  phone: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}
