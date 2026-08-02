import { Response } from "express";

import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { getSubjectsForSchool } from "../../data/subjects";
import { generatePrefix } from "../../utils/admission";
import { SCHOOL_CLASS_MAP } from "../../utils/classSeed";

export const registerSchool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { schoolName, state, lga, schoolType, logoUrl, arms } = req.body;

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
      const prefix = generatePrefix(schoolName);

      const school = await tx.school.create({
        data: {
          name: schoolName,
          address: "",
          state,
          lga,
          schoolType: JSON.stringify(schoolType || ["primary"]),
          admissionPattern: `${prefix}/{year}/{seq}`,
          arms: arms ? JSON.stringify(arms) : undefined,
          logo: logoUrl || null,
          principalId: principal.id,
        },
      });

      const schoolTypes: string[] = schoolType || ["primary"];
      const armList: string[] = Array.isArray(arms) && arms.length > 0 ? arms : [""];
      const classesToCreate: { name: string; level: string; arm: string; schoolType: string }[] = [];
      for (const type of schoolTypes) {
        const entries = SCHOOL_CLASS_MAP[type];
        if (entries) {
          for (const entry of entries) {
            for (const arm of armList) {
              const armSuffix = arm ? ` ${arm}` : "";
              classesToCreate.push({ name: `${entry.name}${armSuffix}`, level: entry.level, arm, schoolType: type });
            }
          }
        }
      }

      if (classesToCreate.length > 0) {
        await tx.class.createMany({ data: classesToCreate.map((c) => ({ ...c, schoolId: school.id })), skipDuplicates: true });
      }

      const subjects = getSubjectsForSchool(schoolTypes);
      if (subjects.length > 0) {
        await tx.subject.createMany({
          data: subjects.map((s) => ({ schoolId: school.id, name: s.name, code: s.code })),
          skipDuplicates: true,
        });
      }

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

      const createdClasses = await tx.class.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true, level: true },
      });

      return { school, user: updatedUser, accessToken, refreshToken, classes: createdClasses };
    });

    res.status(201).json({
      message: "School registered successfully",
      school: {
        id: result.school.id,
        name: result.school.name,
        logo: result.school.logo,
        state: result.school.state,
        lga: result.school.lga,
        schoolType: JSON.parse(result.school.schoolType),
        admissionPattern: result.school.admissionPattern,
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
        needsSchoolSetup: false,
        needsPhoneSetup: !result.user.phone,
      },
      classes: result.classes,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "School Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
