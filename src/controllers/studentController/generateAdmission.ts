import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { generateAdmissionNo } from "../../utils/admission";

export const generateAdmission = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: { admissionPattern: true, admissionCounter: true },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const admissionNo = generateAdmissionNo(school.admissionPattern, school.admissionCounter);

    res.json({ admissionNo, pattern: school.admissionPattern, nextCounter: school.admissionCounter });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Generate Admission");
    res.status(errorResponse.status).json(errorResponse);
  }
};
