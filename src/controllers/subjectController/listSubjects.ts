import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const DEFAULT_SUBJECTS = [
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
];

export const listSubjects = async (req: Request, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || (req as any).user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: "School ID is required" });
    }

    const count = await prisma.subject.count({
      where: { schoolId },
    });

    if (count === 0) {
      await prisma.subject.createMany({
        data: DEFAULT_SUBJECTS.map((s) => ({
          schoolId,
          name: s.name,
          code: s.code,
        })),
      });
    }

    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, createdAt: true },
    });

    res.json({ subjects });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Subjects");
    res.status(errorResponse.status).json(errorResponse);
  }
};
