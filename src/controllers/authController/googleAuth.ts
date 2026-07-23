import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { OAuth2Client } from "google-auth-library";
import { sendWelcomeEmail } from "../../utils/email";
import crypto from "crypto";

const googleClient = new OAuth2Client();

export const googleAuth = async (req: AuthRequest, res: Response) => {
  try {
    const { idToken, deviceId, deviceName } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google auth is not configured" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Google account must have an email" });
    }

    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const image = payload.picture || null;

    let user = await prisma.user.findFirst({
      where: { email },
      include: { school: { select: { name: true } } },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      user = await prisma.user.create({
        data: {
          name,
          email,
          image,
          role: "PRINCIPAL",
          active: true,
          emailVerified: true,
          passwordHash: null,
        },
        include: { school: { select: { name: true } } },
      });

      if (!process.env.DISABLE_EMAILS) {
        try {
          await sendWelcomeEmail(email, name);
        } catch {
          // Silent fail
        }
      }
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
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

    const did = deviceId || crypto.randomUUID();
    const existingSession = await prisma.session.findFirst({
      where: { userId: user.id, deviceId: did },
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
          deviceId: did,
          deviceType: deviceName?.toLowerCase().includes("mobile")
            ? "phone"
            : deviceName?.toLowerCase().includes("tablet")
              ? "tablet"
              : "web",
          deviceName: deviceName || "Google Auth",
          refreshToken,
          isPrimary: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    res.json({
      message: isNewUser ? "Account created successfully" : "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: user.school?.name || null,
        emailVerified: user.emailVerified,
        hasSchool: !!user.schoolId,
        needsSchoolSetup: user.role === "PRINCIPAL" && !user.schoolId,
        needsPhoneSetup: !user.phone,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Google Auth");
    res.status(errorResponse.status).json(errorResponse);
  }
};
