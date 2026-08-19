import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const toDateOnly = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const listCelebrations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const teachers = await prisma.user.findMany({
      where: { schoolId, role: { in: ["TEACHER", "BURSAR"] }, active: true },
      select: { id: true, name: true, role: true, image: true, dateOfBirth: true, employmentDate: true },
    });

    const celebrations: any[] = [];

    teachers.forEach((teacher) => {
      const upcoming: Array<{ date: Date; type: string; extra: Record<string, unknown> }> = [];

      if (teacher.dateOfBirth) {
        upcoming.push({
          date: teacher.dateOfBirth,
          type: "BIRTHDAY",
          extra: {},
        });
      }

      if (teacher.employmentDate) {
        upcoming.push({
          date: teacher.employmentDate,
          type: "WORK_ANNIVERSARY",
          extra: {},
        });
      }

      upcoming.forEach(({ date, type, extra }) => {
        const thisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate());
        if (thisYear < now) {
          thisYear.setFullYear(thisYear.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 30) {
          const years = now.getFullYear() - date.getFullYear();
          celebrations.push({
            id: `${teacher.id}-${type.toLowerCase()}`,
            type,
            personName: teacher.name,
            personRole: teacher.role,
            date: toDateOnly(thisYear),
            imageUrl: teacher.image,
            daysUntil,
            ...(type === "BIRTHDAY" ? { age: years } : { yearsAtSchool: years }),
            ...extra,
          });
        }
      });
    });

    celebrations.sort((a, b) => a.daysUntil - b.daysUntil);

    res.json({ celebrations, total: celebrations.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Celebrations");
    res.status(errorResponse.status).json(errorResponse);
  }
};