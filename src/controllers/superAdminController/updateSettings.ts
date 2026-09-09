import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ error: "settings must be an object of key-value pairs" });
    }

    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.platformSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        }),
      ),
    );

    res.json({ message: "Platform settings updated successfully" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Update Settings");
    res.status(errorResponse.status).json(errorResponse);
  }
};