import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

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
      select: { id: true, name: true, role: true, image: true, createdAt: true },
    });

    const celebrations: any[] = [];

    teachers.forEach((teacher) => {
      if (teacher.createdAt) {
        const hireDate = new Date(teacher.createdAt);
        const thisYearAnniversary = new Date(now.getFullYear(), hireDate.getMonth(), hireDate.getDate());
        if (thisYearAnniversary < now) {
          thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYearAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 30) {
          const yearsAtSchool = now.getFullYear() - hireDate.getFullYear();
          celebrations.push({
            id: `${teacher.id}-anniversary`,
            type: "WORK_ANNIVERSARY",
            personName: teacher.name,
            personRole: teacher.role,
            date: thisYearAnniversary.toISOString().split("T")[0],
            yearsAtSchool,
            imageUrl: teacher.image,
            daysUntil,
          });
        }
      }
    });

    celebrations.sort((a, b) => a.daysUntil - b.daysUntil);

    res.json({ celebrations, total: celebrations.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "List Celebrations");
    res.status(errorResponse.status).json(errorResponse);
  }
};
