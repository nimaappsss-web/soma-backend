import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        employmentDate: true,
        address: true,
        gender: true,
        role: true,
        active: true,
        approvalStatus: true,
        passwordHash: true,
        emailVerified: true,
        schoolId: true,
        school: { select: { id: true, name: true, logo: true, state: true, lga: true, schoolType: true, arms: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        deviceId: true,
        deviceType: true,
        deviceName: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy: { lastActivityAt: "desc" },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split("T")[0] : null,
      employmentDate: user.employmentDate ? user.employmentDate.toISOString().split("T")[0] : null,
      address: user.address,
      gender: user.gender,
      role: user.role,
      active: user.active,
      approvalStatus: user.approvalStatus,
      needsRegistration: !user.passwordHash,
      needsSchoolSetup: user.role === "PRINCIPAL" && !user.schoolId,
      needsPhoneSetup: !user.phone,
      emailVerified: user.emailVerified,
      schoolId: user.schoolId,
      school: user.school ? { ...user.school, schoolType: JSON.parse(user.school.schoolType), arms: JSON.parse(user.school.arms) } : null,
      sessions,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get User Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};
