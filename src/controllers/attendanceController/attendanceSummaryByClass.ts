import { Response } from "express";
import { AuthRequest } from "../../types";
import { getAttendanceClassSummary } from "../../utils/attendanceClassSummary";
import { createErrorResponse } from "../../utils/errorHandler";

export const attendanceSummaryByClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId } = req.params;
    const { from, to } = req.query;

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
    const errorResponse = createErrorResponse(error, "Attendance Summary By Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
