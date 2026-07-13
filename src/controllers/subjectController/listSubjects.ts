import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const SUBJECTS_BY_TYPE: Record<string, { name: string; code: string }[]> = {
  creche: [
    { name: "Sensory Play", code: "SEN" },
    { name: "Music & Movement", code: "MVM" },
    { name: "Art & Craft", code: "ART" },
    { name: "Story Time", code: "STO" },
    { name: "Outdoor Play", code: "OUT" },
  ],
  kindergarten: [
    { name: "Literacy", code: "LIT" },
    { name: "Numeracy", code: "NUM" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Music", code: "MUS" },
    { name: "Physical Development", code: "PED" },
    { name: "Science & Nature", code: "SCN" },
    { name: "Social Habits", code: "SOC" },
  ],
  primary: [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Physical Education", code: "PHE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Religious Studies", code: "REL" },
    { name: "Home Economics", code: "HME" },
    { name: "Agricultural Science", code: "AGR" },
  ],
  secondary: [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Biology", code: "BIO" },
    { name: "Further Mathematics", code: "FURM" },
    { name: "Economics", code: "ECO" },
    { name: "Literature in English", code: "LIT" },
    { name: "Government", code: "GOV" },
    { name: "History", code: "HIS" },
  ],
  both: [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Physical Education", code: "PHE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Religious Studies", code: "REL" },
    { name: "Home Economics", code: "HME" },
    { name: "Agricultural Science", code: "AGR" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Biology", code: "BIO" },
    { name: "Further Mathematics", code: "FURM" },
    { name: "Economics", code: "ECO" },
    { name: "Literature in English", code: "LIT" },
    { name: "Government", code: "GOV" },
    { name: "History", code: "HIS" },
  ],
};

export const listSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const count = await prisma.subject.count({
      where: { schoolId },
    });

    if (count === 0) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolType: true },
      });

      const type = school?.schoolType || "secondary";
      const subjects = SUBJECTS_BY_TYPE[type] || SUBJECTS_BY_TYPE.secondary;

      await prisma.subject.createMany({
        data: subjects.map((s) => ({
          schoolId,
          name: s.name,
          code: s.code,
        })),
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where = { schoolId };

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, createdAt: true, updatedAt: true, syncStatus: true, syncedAt: true, version: true },
        skip,
        take: limit,
      }),
      prisma.subject.count({ where }),
    ]);

    res.json({ subjects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Subjects");
    res.status(errorResponse.status).json(errorResponse);
  }
};
