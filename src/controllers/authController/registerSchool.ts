import { Response } from "express";

import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";

export const registerSchool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { schoolName, state, lga, schoolType, logoUrl } = req.body;

    const principal = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!principal || principal.role !== "PRINCIPAL") {
      return res.status(403).json({ error: "Only principals can register a school" });
    }

    if (principal.schoolId) {
      return res.status(400).json({ error: "Principal already has a school registered" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          address: "",
          state,
          lga,
          schoolType,
          logo: logoUrl || null,
          principalId: principal.id,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: principal.id },
        data: { schoolId: school.id },
      });

      const tokenPayload = {
        userId: updatedUser.id,
        schoolId: school.id,
        role: updatedUser.role,
        email: updatedUser.email || updatedUser.phone || undefined,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const existingSession = await tx.session.findFirst({
        where: { userId: principal.id },
        orderBy: { lastActivityAt: "desc" },
      });

      if (existingSession) {
        await tx.session.update({
          where: { id: existingSession.id },
          data: { refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        });
      } else {
        await tx.session.create({
          data: {
            userId: principal.id,
            deviceId: req.body.deviceId || "web",
            deviceType: "web",
            deviceName: "Web Browser",
            refreshToken,
            isPrimary: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return { school, user: updatedUser, accessToken, refreshToken };
    });

    res.status(201).json({
      message: "School registered successfully",
      school: {
        id: result.school.id,
        name: result.school.name,
        logo: result.school.logo,
        state: result.school.state,
        lga: result.school.lga,
        schoolType: result.school.schoolType,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        image: result.user.image,
        schoolId: result.user.schoolId,
        emailVerified: result.user.emailVerified,
        hasSchool: !!result.user.schoolId,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "School Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
