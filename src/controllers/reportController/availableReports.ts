import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";

export const availableReports = async (req: AuthRequest, res: Response) => {
  try {
    const types = [
      { type: "REPORT_CARD", description: "Per-student end-of-term report with subjects, scores, grades, position, attendance" },
      { type: "CLASS_SUMMARY", description: "Class performance overview: average by subject, pass rate, top students" },
      { type: "ATTENDANCE", description: "Attendance report for a class or date range" },
      { type: "FULL", description: "Combined report card + class summary" },
    ];

    res.json({ templates: types });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Available Reports");
    res.status(errorResponse.status).json(errorResponse);
  }
};
