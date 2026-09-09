import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const DEFAULT_SETTINGS: Record<string, unknown> = {
  allowPublicSignup: true,
  maintenanceMode: false,
  disableSchoolCreation: false,
  defaultSchoolPaymentMode: "manual",
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.platformSetting.findMany({ orderBy: { key: "asc" } });

    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    res.json({ settings });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Get Settings");
    res.status(errorResponse.status).json(errorResponse);
  }
};