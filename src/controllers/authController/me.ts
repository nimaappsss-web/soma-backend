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
        role: true,
        active: true,
        passwordHash: true,
        emailVerified: true,
        schoolId: true,
        school: { select: { id: true, name: true, logo: true, state: true, lga: true, schoolType: true, arms: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      needsRegistration: !user.passwordHash,
      emailVerified: user.emailVerified,
      schoolId: user.schoolId,
      school: user.school ? { ...user.school, arms: JSON.parse(user.school.arms) } : null,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get User Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};
