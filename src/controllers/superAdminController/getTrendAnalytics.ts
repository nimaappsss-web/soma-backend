import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const bucketByMonth = (rows: { createdAt: Date }[], months: number) => {
  const buckets: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: date.toLocaleString("en-US", { month: "short", year: "2-digit" }), count: 0 });
  }
  for (const row of rows) {
    const key = `${row.createdAt.getUTCFullYear()}-${String(row.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  }
  return buckets;
};

export const getTrendAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const months = Math.min(24, Math.max(3, parseInt(req.query.months as string) || 12));

    const [users, schools] = await Promise.all([
      prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.school.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    res.json({
      months,
      users: bucketByMonth(users, months),
      schools: bucketByMonth(schools, months),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Trend Analytics");
    res.status(errorResponse.status).json(errorResponse);
  }
};