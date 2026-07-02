import { Response } from "express";
import crypto from "crypto";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { generateAccessToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const verifyEmailOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code, password, deviceId, deviceName } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "OTP code is required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
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

    const passwordHash = await hashPassword(password);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: updatedUser.id,
      schoolId: updatedUser.schoolId || undefined,
      role: updatedUser.role,
      email: updatedUser.email || undefined,
    });

    const did = deviceId || crypto.randomUUID();
    const dName = deviceName || "Web Browser";

    const existingSession = await prisma.session.findFirst({
      where: { userId: updatedUser.id, deviceId: did },
    });

    if (existingSession) {
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          refreshToken: accessToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(),
        },
      });
    } else {
      await prisma.session.create({
        data: {
          userId: updatedUser.id,
          deviceId: did,
          deviceType: dName.toLowerCase().includes("mobile")
            ? "phone"
            : dName.toLowerCase().includes("tablet")
              ? "tablet"
              : "web",
          deviceName: dName,
          refreshToken: accessToken,
          isPrimary: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    res.json({
      message: "Email verified and account activated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
        schoolId: updatedUser.schoolId,
        schoolName: user.school?.name || null,
      },
      accessToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Email OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
