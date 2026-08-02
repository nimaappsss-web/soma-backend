import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const REPORT_TEMPLATES = ["classic", "modern", "compact"] as const;
export const REPORT_THEMES = ["slate", "emerald", "indigo", "amber"] as const;

export const getReportSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const settings = await prisma.schoolReportSettings.findUnique({
      where: { schoolId: req.user.schoolId },
    });

    res.json({
      template: settings?.template ?? "classic",
      theme: settings?.theme ?? "slate",
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get Report Settings");
    res.status(errorResponse.status).json(errorResponse);
  }
};

export const updateReportSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { template, theme } = req.body ?? {};

    if (template !== undefined && !REPORT_TEMPLATES.includes(template)) {
      return res.status(400).json({ error: "template must be one of: classic, modern, compact" });
    }
    if (theme !== undefined && !REPORT_THEMES.includes(theme)) {
      return res.status(400).json({ error: "theme must be one of: slate, emerald, indigo, amber" });
    }

    const settings = await prisma.schoolReportSettings.upsert({
      where: { schoolId: req.user.schoolId },
      update: {
        ...(template !== undefined ? { template } : {}),
        ...(theme !== undefined ? { theme } : {}),
      },
      create: {
        schoolId: req.user.schoolId,
        template: template ?? "classic",
        theme: theme ?? "slate",
      },
    });

    res.json({ template: settings.template, theme: settings.theme });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Report Settings");
    res.status(errorResponse.status).json(errorResponse);
  }
};
