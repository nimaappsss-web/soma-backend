import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, phone, gender, role, department, designation, status } = req.body;

    const staff = await prisma.staff.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    const updated = await prisma.staff.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(designation !== undefined ? { designation } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    res.json({ staff: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
