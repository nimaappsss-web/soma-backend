import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { exampleToPattern, generateAdmissionNo } from "../../utils/admission";
import { SCHOOL_CLASS_MAP } from "../../utils/classSeed";

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

    // Auto-seed classes when arms or schoolType change
    const finalSchoolType = schoolType || (school.schoolType ? JSON.parse(school.schoolType) : ["primary"]);
    const finalArms = arms !== undefined ? arms : (school.arms ? JSON.parse(school.arms) : []);

    const armList: string[] = Array.isArray(finalArms) && finalArms.length > 0 ? finalArms : [""];

    const existingClasses = await prisma.class.findMany({
      where: { schoolId: req.user.schoolId },
      select: { level: true, arm: true },
    });

    const existingKeys = new Set(existingClasses.map((c) => `${c.level}|${c.arm}`));

    const toCreate: { name: string; level: string; arm: string; schoolId: string; schoolType: string }[] = [];

    const schoolTypes: string[] = Array.isArray(finalSchoolType) ? finalSchoolType : [finalSchoolType];

    for (const type of schoolTypes) {
      const entries = SCHOOL_CLASS_MAP[type];
      if (entries) {
        for (const entry of entries) {
          for (const arm of armList) {
            const key = `${entry.level}|${arm}`;
            if (!existingKeys.has(key)) {
              const armSuffix = arm ? ` ${arm}` : "";
              toCreate.push({
                name: `${entry.name}${armSuffix}`,
                level: entry.level,
                arm,
                schoolId: req.user.schoolId,
                schoolType: type,
              });
            }
          }
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.class.createMany({ data: toCreate, skipDuplicates: true });
    }

    if (admissionPattern !== undefined) {
      const finalPattern = /\d/.test(admissionPattern) ? exampleToPattern(admissionPattern) : admissionPattern;

      const students = await prisma.student.findMany({
        where: { schoolId: req.user.schoolId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (students.length > 0) {
        const updates = students.map((student, index) => {
          const newAdmissionNo = generateAdmissionNo(finalPattern, index + 1);
          return prisma.student.update({
            where: { id: student.id },
            data: { admissionNo: newAdmissionNo },
          });
        });

        await prisma.$transaction([
          ...updates,
          prisma.school.update({
            where: { id: req.user.schoolId },
            data: { admissionCounter: students.length + 1 },
          }),
        ]);
      }
    }

    res.json({ school: { ...updated, schoolType: JSON.parse(updated.schoolType), arms: JSON.parse(updated.arms) } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update School");
    res.status(errorResponse.status).json(errorResponse);
  }
};
