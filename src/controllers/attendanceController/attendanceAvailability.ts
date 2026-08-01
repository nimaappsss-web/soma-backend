import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDay } from "../../utils/attendanceAvailability";

export const attendanceAvailability = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }
    targetDate.setUTCHours(0, 0, 0, 0);

    const classification = await classifySchoolDay(req.user.schoolId, targetDate);

    res.json({
      date: date as string,
      available: classification.available,
      reason: classification.available
        ? { available: true }
        : {
            type: classification.type,
            message: classification.message,
          },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Attendance Availability");
    res.status(errorResponse.status).json(errorResponse);
  }
};
