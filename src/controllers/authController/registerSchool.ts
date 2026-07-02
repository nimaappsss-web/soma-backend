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

    const school = await prisma.school.create({
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

    const updatedUser = await prisma.user.update({
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

    await prisma.session.updateMany({
      where: { userId: principal.id, isPrimary: true },
      data: { refreshToken },
    });

    res.status(201).json({
      message: "School registered successfully",
      school: {
        id: school.id,
        name: school.name,
        logo: school.logo,
        state: school.state,
        lga: school.lga,
        schoolType: school.schoolType,
      },
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        image: updatedUser.image,
        schoolId: updatedUser.schoolId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "School Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
