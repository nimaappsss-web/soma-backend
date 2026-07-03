import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const verifyEmailOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "OTP code is required" });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const user = await prisma.user.findFirst({
      where: { email },
      include: { school: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: updatedUser.id,
      schoolId: updatedUser.schoolId || undefined,
      role: updatedUser.role,
      email: updatedUser.email || undefined,
    });

    const refreshToken = generateRefreshToken({
      userId: updatedUser.id,
      schoolId: updatedUser.schoolId || undefined,
      role: updatedUser.role,
      email: updatedUser.email || undefined,
    });

    await prisma.session.create({
      data: {
        userId: updatedUser.id,
        deviceId: req.body.deviceId || crypto.randomUUID(),
        deviceType: "web",
        deviceName: req.body.deviceName || "Web Browser",
        refreshToken,
        isPrimary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Email verified successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        image: updatedUser.image,
        emailVerified: true,
        schoolId: updatedUser.schoolId,
        schoolName: user.school?.name || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Email OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
