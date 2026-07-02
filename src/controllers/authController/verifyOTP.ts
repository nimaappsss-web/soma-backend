import { Response } from "express";
import { AuthRequest, VerifyOTPDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePhoneNumber } from "../../utils/validation";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const verifyOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, code, deviceId, deviceName }: VerifyOTPDto = req.body;

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone,
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
      where: { phone },
      include: { school: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "No account found with this phone number" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
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
          deviceName,
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
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
