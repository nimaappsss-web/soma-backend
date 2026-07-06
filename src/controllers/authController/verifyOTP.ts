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

    let user = await prisma.user.findFirst({
      where: { phone },
      include: { school: true },
    });

    if (!user) {
      const pendingInvite = await prisma.inviteToken.findFirst({
        where: {
          invitedPhone: phone,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!pendingInvite) {
        return res
          .status(404)
          .json({ error: "No account found with this phone number" });
      }

      user = await prisma.user.create({
        data: {
          name: phone,
          phone,
          role: pendingInvite.role,
          schoolId: pendingInvite.schoolId,
          passwordHash: null,
          active: true,
        },
        include: { school: true },
      });

      await prisma.inviteToken.update({
        where: { id: pendingInvite.id },
        data: { usedAt: new Date(), usedBy: user.id },
      });
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

    const needsRegistration = !user.passwordHash;

    res.json({
      message: needsRegistration
        ? "Phone verified. Please complete your registration."
        : "Login successful",
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
        needsRegistration,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
