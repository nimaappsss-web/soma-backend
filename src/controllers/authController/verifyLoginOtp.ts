import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const verifyLoginOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, code, deviceId, deviceName } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ error: "Identifier and code are required" });
    }

    const isEmail = validateEmail(identifier);
    const isPhone = validatePhoneNumber(identifier);

    if (!isEmail && !isPhone) {
      return res.status(400).json({ error: "Invalid phone number or email format" });
    }

    const otp = await prisma.oTP.findFirst({
      where: isEmail ? { email: identifier, code, verified: false } : { phone: identifier, code, verified: false },
    });

    if (!otp) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    if (otp.expiresAt < new Date()) {
      return res.status(401).json({ error: "OTP has expired" });
    }

    await prisma.oTP.update({ where: { id: otp.id }, data: { verified: true } });

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
      include: { school: { select: { name: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: "No account found with this identifier" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    if (user.email && isEmail && !user.emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
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
          deviceType: deviceName?.toLowerCase().includes("mobile")
            ? "phone"
            : deviceName?.toLowerCase().includes("tablet")
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
        hasSchool: !!user.schoolId,
        needsSchoolSetup: user.role === "PRINCIPAL" && !user.schoolId,
        needsPhoneSetup: !user.phone,
        needsRegistration: !user.passwordHash,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Login OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
