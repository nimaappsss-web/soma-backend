import { Response } from "express";
import crypto from "crypto";

import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";
import { AuthRequest, RegisterPrincipalDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { sendEmailOtp } from "../../utils/email";
import { generateOTP } from "../../utils/tokens";

export const registerPrincipal = async (req: AuthRequest, res: Response) => {
  try {
    const {
      principalName,
      principalEmail,
      principalPhone,
      password,
      imageUrl,
    }: RegisterPrincipalDto = req.body;

    if (!validatePhoneNumber(principalPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (principalEmail && !validateEmail(principalEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: principalPhone },
    });

    if (existingPhone) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    if (principalEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: principalEmail },
      });

      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }
    }

    const passwordHash = await hashPassword(password);

    const principal = await prisma.user.create({
      data: {
        name: principalName,
        email: principalEmail || null,
        phone: principalPhone,
        passwordHash,
        role: "PRINCIPAL",
        active: true,
        image: imageUrl || null,
      },
    });

    let emailOtpSent = false;
    if (principal.email) {
      const otp = generateOTP();
      await prisma.oTP.create({
        data: {
          email: principal.email,
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      try {
        await sendEmailOtp(principal.email, principal.name, otp);
        emailOtpSent = true;
      } catch (err: any) {
        console.error("Register principal send email OTP error:", err?.message || err);
      }
    }

    const tokenPayload = {
      userId: principal.id,
      schoolId: "",
      role: principal.role,
      email: principal.email || principal.phone || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.session.create({
      data: {
        userId: principal.id,
        deviceId: req.body.deviceId || crypto.randomUUID(),
        deviceType: "web",
        deviceName: req.body.deviceName || "Web Browser",
        refreshToken,
        isPrimary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: "Principal registered successfully",
      user: {
        id: principal.id,
        name: principal.name,
        email: principal.email,
        phone: principal.phone,
        role: principal.role,
        image: principal.image,
      },
      emailOtpSent,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Principal Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
