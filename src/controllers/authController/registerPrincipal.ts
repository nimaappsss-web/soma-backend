import { Response } from "express";

import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { AuthRequest, RegisterPrincipalDto } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendEmailOtp } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { generateOTP, OTP_TTL_MS } from "../../utils/tokens";
import { prisma } from "../../utils/prisma";

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
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      });
      try {
        await sendEmailOtp(principal.email, principal.name, otp, getFrontendUrl(req));
        emailOtpSent = true;
      } catch (err: any) {
        console.error("Register principal send email OTP error:", err?.message || err);
      }
    }

    res.status(201).json({
      message: "Principal registered successfully",
      user: {
        id: principal.id,
        name: principal.name,
        email: principal.email,
        phone: principal.phone,
        role: principal.role,
        image: principal.image,
        emailVerified: principal.emailVerified,
        hasSchool: !!principal.schoolId,
        needsPhoneSetup: !principal.phone,
      },
      emailOtpSent,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Principal Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
