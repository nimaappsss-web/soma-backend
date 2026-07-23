import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { exampleToPattern } from "../../utils/admission";

export const updateSchool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, address, state, lga, schoolType, logo, admissionPattern, arms } = req.body;

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    if (arms !== undefined || schoolType !== undefined) {
      const studentCount = await prisma.student.count({
        where: { schoolId: req.user.schoolId },
      });
      if (studentCount > 0) {
        if (arms !== undefined) {
          return res.status(400).json({ error: "Cannot change arms after students have been registered" });
        }
        if (schoolType !== undefined) {
          return res.status(400).json({ error: "Cannot change school type after students have been registered" });
        }
      }
    }

    const updated = await prisma.school.update({
      where: { id: req.user.schoolId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(lga !== undefined ? { lga } : {}),
        ...(schoolType !== undefined ? { schoolType: JSON.stringify(schoolType) } : {}),
        ...(logo !== undefined ? { logo } : {}),
        ...(arms !== undefined ? { arms: JSON.stringify(arms) } : {}),
        ...(admissionPattern !== undefined ? { admissionPattern: /\d/.test(admissionPattern) ? exampleToPattern(admissionPattern) : admissionPattern } : {}),
      },
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

    res.json({ school: { ...updated, schoolType: JSON.parse(updated.schoolType), arms: JSON.parse(updated.arms) } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update School");
    res.status(errorResponse.status).json(errorResponse);
  }
};
