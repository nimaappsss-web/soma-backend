import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const financeSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;

    const [totalExpected, totalCollected, byClass, recentPayments] = await Promise.all([
      prisma.invoice.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.feeStructure.groupBy({
        by: ["classId"],
        where: { schoolId },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: { schoolId },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const expected = totalExpected._sum.amount || 0;
    const collected = totalCollected._sum.amount || 0;
    const outstanding = expected - collected;
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    const classIds = byClass.map((c) => c.classId);
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    res.json({
      totalExpected: expected,
      totalCollected: collected,
      outstanding,
      collectionRate,
      byClass: byClass.map((c) => ({
        className: classMap[c.classId] || "Unknown",
        expected: c._sum.amount || 0,
        collected: 0,
        outstanding: c._sum.amount || 0,
      })),
      recentPayments: recentPayments.map((p) => ({
        date: p.createdAt,
        studentName: p.student.name,
        amount: p.amount,
        method: p.method,
      })),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Finance Summary");
    res.status(errorResponse.status).json(errorResponse);
  }
};
