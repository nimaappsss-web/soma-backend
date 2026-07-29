import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const studentStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const [total, active, byStatus, byGender, byClass] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
      prisma.student.groupBy({ by: ["status"], where: { schoolId }, _count: { status: true } }),
      prisma.student.groupBy({ by: ["gender"], where: { schoolId, status: "ACTIVE" }, _count: { gender: true } }),
      prisma.student.groupBy({
        by: ["classId"],
        where: { schoolId, status: "ACTIVE" },
        _count: { classId: true },
      }),
    ]);

    const classIds = byClass.map((c) => c.classId);
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    res.json({
      total,
      active,
      byClass: byClass.map((c) => ({
        classId: c.classId,
        className: classMap[c.classId] || "Unknown",
        count: c._count.classId,
      })),
      byGender: {
        male: byGender.find((g) => g.gender === "M")?._count.gender || 0,
        female: byGender.find((g) => g.gender === "F")?._count.gender || 0,
      },
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status.toLowerCase(), s._count.status])
      ),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Student Stats");
    res.status(errorResponse.status).json(errorResponse);
  }
};
