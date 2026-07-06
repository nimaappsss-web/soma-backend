import { Response } from "express";

import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { validateEmail } from "../../utils/validation";
import { prisma } from "../../utils/prisma";
import { AuthRequest } from "../../types";

export const verifyEmailOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code, deviceId, deviceName } = req.body;

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

    let user = await prisma.user.findFirst({
      where: { email },
      include: { school: true },
    });

    if (!user) {
      const pendingInvite = await prisma.inviteToken.findFirst({
        where: {
          invitedEmail: email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!pendingInvite) {
        return res
          .status(404)
          .json({ error: "No account found with this email" });
      }

      user = await prisma.user.create({
        data: {
          name: email,
          email,
          role: pendingInvite.role,
          schoolId: pendingInvite.schoolId,
          passwordHash: null,
          emailVerified: true,
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

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || undefined,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || undefined,
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
          deviceId: deviceId || "web",
          deviceType: deviceName?.toLowerCase().includes("mobile")
            ? "phone"
            : deviceName?.toLowerCase().includes("tablet")
              ? "tablet"
              : "web",
          deviceName: deviceName || "Web Browser",
          refreshToken,
          isPrimary: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const needsRegistration = !user.passwordHash;

    res.json({
      message: needsRegistration
        ? "Email verified. Please complete your registration."
        : "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: user.school?.name || null,
        needsRegistration,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Email OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
