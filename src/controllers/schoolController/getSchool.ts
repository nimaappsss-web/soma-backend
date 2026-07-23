import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const getSchool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        state: true,
        lga: true,
        schoolType: true,
        logo: true,
        admissionPattern: true,
        admissionCounter: true,
        arms: true,
      },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    res.json({
      school: {
        ...school,
        arms: JSON.parse(school.arms),
        schoolType: JSON.parse(school.schoolType),
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get School");
    res.status(errorResponse.status).json(errorResponse);
  }
};
