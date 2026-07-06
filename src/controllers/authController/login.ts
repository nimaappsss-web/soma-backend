import { Response } from "express";
import { AuthRequest, UnifiedLoginDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { comparePassword } from "../../utils/password";
import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, password, deviceId, deviceName }: UnifiedLoginDto =
      req.body;

    const isEmail = validateEmail(identifier);
    const isPhone = validatePhoneNumber(identifier);

    if (!isEmail && !isPhone) {
      return res
        .status(400)
        .json({ error: "Invalid phone number or email format" });
    }

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
      include: {
        school: true,
        assignments: {
          include: { classes: true, subject: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    if (user.email && !user.emailVerified) {
      return res.status(403).json({ error: "Email not verified. Please verify your email first." });
    }

    if (password && user.passwordHash) {
      const isValidPassword = await comparePassword(
        password,
        user.passwordHash,
      );
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } else if (!password && !user.passwordHash) {
      return res
        .status(400)
        .json({ error: "This account uses OTP login. Please request an OTP." });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
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
      where: {
        userId: user.id,
        deviceId,
      },
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
        emailVerified: user.emailVerified,
        hasSchool: !!user.schoolId,
        needsRegistration: !user.passwordHash,
        assignments: user.assignments.map((a) => ({
          id: a.id,
          type: a.type,
          subject: a.subject ? { id: a.subject.id, name: a.subject.name } : null,
          classes: a.classes.map((c) => ({
            classId: c.classId,
          })),
        })),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Login");
    res.status(errorResponse.status).json(errorResponse);
  }
};
