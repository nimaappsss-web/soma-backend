import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { verifyRegistrationToken, generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { hashPassword, validatePassword } from "../../utils/password";
import { validatePhoneNumber } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";
import crypto from "crypto";

export const completeProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationToken, name, phone, password, imageUrl } = req.body;

    if (!registrationToken) {
      return res.status(400).json({ error: "Registration token is required" });
    }

    let tokenPayload;
    try {
      tokenPayload = verifyRegistrationToken(registrationToken);
    } catch {
      return res.status(401).json({ error: "Invalid or expired registration token. Please start over." });
    }

    const { email } = tokenPayload;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }

    if (!phone || !validatePhoneNumber(phone)) {
      return res.status(400).json({ error: "A valid phone number is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingPhone) {
      return res.status(409).json({ error: "Phone number already registered" });
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        phone,
        passwordHash,
        role: "PRINCIPAL",
        active: true,
        emailVerified: true,
        image: imageUrl || null,
      },
    });

    const tokenPayloadFull = {
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || undefined,
    };

    const accessToken = generateAccessToken(tokenPayloadFull);
    const refreshToken = generateRefreshToken(tokenPayloadFull);

    await prisma.session.create({
      data: {
        userId: user.id,
        deviceId: req.body.deviceId || crypto.randomUUID(),
        deviceType: "web",
        deviceName: req.body.deviceName || "Web Browser",
        refreshToken,
        isPrimary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: "Profile created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
        schoolId: user.schoolId,
        emailVerified: user.emailVerified,
        hasSchool: !!user.schoolId,
        needsSchoolSetup: true,
        needsPhoneSetup: false,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Complete Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};
