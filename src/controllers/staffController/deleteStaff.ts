import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const staff = await prisma.staff.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    await prisma.staff.delete({ where: { id: req.params.id } });

    res.json({ message: "Staff removed" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
