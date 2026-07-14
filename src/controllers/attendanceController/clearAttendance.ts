import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const clearAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, date, studentIds } = req.body;
    const schoolId = req.user.schoolId;

    const where: any = { student: { schoolId } };

    if (classId) where.classId = classId;
    if (date) where.date = new Date(date);
    if (studentIds && Array.isArray(studentIds)) where.studentId = { in: studentIds };

    const { count } = await prisma.attendance.deleteMany({ where });

    res.json({ message: `Deleted ${count} attendance record(s)`, deleted: count });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Clear Attendance");
    res.status(errorResponse.status).json(errorResponse);
  }
};
