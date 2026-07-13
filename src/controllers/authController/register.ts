import { Response } from "express";
import crypto from "crypto";

import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";
import { AuthRequest, RegisterSchoolDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { sendEmailOtp } from "../../utils/email";
import { generateOTP } from "../../utils/tokens";

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const {
      schoolName,
      state,
      lga,
      schoolType,
      principalName,
      principalEmail,
      principalPhone,
      password,
      imageUrl,
      logoUrl,
      arms,
    }: RegisterSchoolDto = req.body;

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

    const school = await prisma.school.create({
      data: {
        name: schoolName,
        address: "",
        state,
        lga,
        schoolType,
        arms: arms ? JSON.stringify(arms) : undefined,
        logo: logoUrl || null,
      },
    });

    const principal = await prisma.user.create({
      data: {
        name: principalName,
        email: principalEmail || null,
        phone: principalPhone,
        passwordHash,
        role: "PRINCIPAL",
        schoolId: school.id,
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
        console.error("Registration send email OTP error:", err?.message || err);
      }
    }

    const accessToken = generateAccessToken({
      userId: principal.id,
      schoolId: school.id,
      role: principal.role,
      email: principal.email || principal.phone || undefined,
    });

    const refreshToken = generateRefreshToken({
      userId: principal.id,
      schoolId: school.id,
      role: principal.role,
      email: principal.email || principal.phone || undefined,
    });

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
      message: "School and principal registered successfully",
      school: {
        id: school.id,
        name: school.name,
        logo: school.logo,
      },
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
    const errorResponse = createErrorResponse(error, "Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
