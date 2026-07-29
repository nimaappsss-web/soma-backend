import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteHoliday = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const holiday = await prisma.holiday.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    await prisma.holiday.delete({ where: { id: req.params.id } });

    res.json({ message: "Holiday removed" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Holiday");
    res.status(errorResponse.status).json(errorResponse);
  }
};
