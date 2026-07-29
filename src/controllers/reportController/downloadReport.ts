import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const downloadReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const report = await prisma.report.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (report.status !== "GENERATED" || !report.downloadUrl) {
      return res.status(400).json({ error: "Report is not ready for download" });
    }

    res.json({
      reportId: report.id,
      downloadUrl: report.downloadUrl,
      generatedAt: report.createdAt,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Download Report");
    res.status(errorResponse.status).json(errorResponse);
  }
};
