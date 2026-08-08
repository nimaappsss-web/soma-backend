import { Response } from "express";
import { createErrorResponse } from "../../utils/errorHandler";
import { validateEmail } from "../../utils/validation";
import { prisma } from "../../utils/prisma";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { AuthRequest } from "../../types";

export const verifyEmailOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code, deviceId = "web", deviceName = "Web" } = req.body;

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
      include: { school: { select: { name: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: "No account found with this email" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    if (user.email && !user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || user.phone || undefined,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || user.phone || undefined,
    });

    const existingSession = await prisma.session.findFirst({
      where: { userId: user.id, deviceId },
    });

    if (existingSession) {
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(),
        },
      });
    } else {
      await prisma.session.create({
        data: {
          userId: user.id,
          deviceId,
          deviceType: deviceName.toLowerCase().includes("mobile")
            ? "phone"
            : deviceName.toLowerCase().includes("tablet")
              ? "tablet"
              : "web",
          deviceName: deviceName || "Unknown",
          refreshToken,
          isPrimary: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: user.school?.name || null,
        emailVerified: user.emailVerified,
        approvalStatus: user.approvalStatus,
        hasSchool: !!user.schoolId,
        needsSchoolSetup: user.role === "PRINCIPAL" && !user.schoolId,
        needsPhoneSetup: !user.phone,
        needsRegistration: !user.passwordHash,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Email OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};