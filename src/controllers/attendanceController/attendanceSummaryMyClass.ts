import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { getAttendanceClassSummary } from "../../utils/attendanceClassSummary";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceSummaryMyClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId || !req.user.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId } = req.params;
    const { from, to } = req.query;

    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    const [isAssigned, teacher] = await Promise.all([
      prisma.teacherAssignmentClass.findFirst({
        where: {
          classId,
          assignment: { teacherId: req.user.userId, schoolId: req.user.schoolId },
        },
        select: { classId: true },
      }),
      prisma.user.findFirst({
        where: { id: req.user.userId, schoolId: req.user.schoolId },
        select: { formClassId: true },
      }),
    ]);

    const isFormTeacher = teacher?.formClassId === classId;

    if (!isAssigned && !isFormTeacher) {
      return res.status(403).json({ error: "You are not assigned to this class" });
    }

    const summary = await getAttendanceClassSummary({
      schoolId: req.user.schoolId,
      classId,
      from: from as string | undefined,
      to: to as string | undefined,
    });

    if (!summary) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json(summary);
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Summary My Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
