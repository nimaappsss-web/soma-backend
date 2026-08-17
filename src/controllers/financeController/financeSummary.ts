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

    const [totalExpected, totalCollected, feeStructures, recentPayments] = await Promise.all([
      prisma.invoice.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { schoolId, status: "CONFIRMED" }, _sum: { amount: true } }),
      prisma.feeStructure.findMany({
        where: { schoolId },
        select: { classIds: true, amount: true },
      }),
      prisma.payment.findMany({
        where: { schoolId, status: "CONFIRMED" },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { confirmedAt: "desc" },
        take: 10,
      }),
    ]);

    const expected = totalExpected._sum.amount || 0;
    const collected = totalCollected._sum.amount || 0;
    const outstanding = expected - collected;
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    const expectedByClassMap: Record<string, number> = {};
    for (const fee of feeStructures) {
      const feeClassIds = (fee.classIds as string[]) ?? [];
      for (const cid of feeClassIds) {
        expectedByClassMap[cid] = (expectedByClassMap[cid] || 0) + (fee.amount || 0);
      }
    }

    const classIds = Object.keys(expectedByClassMap);
    const classes = classIds.length > 0
      ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
      : [];
    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    const collectedByClass = await prisma.payment.groupBy({
      by: ["studentId"],
      where: { schoolId, status: "CONFIRMED" },
      _sum: { amount: true },
    });
    const studentsWithClass = await prisma.student.findMany({
      where: { id: { in: collectedByClass.map((c) => c.studentId) } },
      select: { id: true, classId: true },
    });
    const studentClassMap = Object.fromEntries(studentsWithClass.map((s) => [s.id, s.classId]));
    const collectedByClassMap: Record<string, number> = {};
    for (const row of collectedByClass) {
      const clsId = studentClassMap[row.studentId];
      if (!clsId) continue;
      collectedByClassMap[clsId] = (collectedByClassMap[clsId] || 0) + (row._sum.amount || 0);
    }

    res.json({
      totalExpected: expected,
      totalCollected: collected,
      outstanding,
      collectionRate,
      byClass: classIds.map((cid) => ({
        className: classMap[cid] || "Unknown",
        expected: expectedByClassMap[cid] || 0,
        collected: collectedByClassMap[cid] || 0,
        outstanding: (expectedByClassMap[cid] || 0) - (collectedByClassMap[cid] || 0),
      })),
      recentPayments: recentPayments.map((p) => ({
        date: p.confirmedAt ?? p.createdAt,
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
