import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, phone, image, dateOfBirth, employmentDate, address, gender } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth || null } : {}),
        ...(employmentDate !== undefined ? { employmentDate: employmentDate || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(gender !== undefined ? { gender: gender || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        employmentDate: true,
        address: true,
        gender: true,
        role: true,
        active: true,
      },
    });

    res.json({
      user: {
        ...updated,
        dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString().split("T")[0] : null,
        employmentDate: updated.employmentDate ? updated.employmentDate.toISOString().split("T")[0] : null,
        needsPhoneSetup: !updated.phone,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Profile");
    res.status(errorResponse.status).json(errorResponse);
  }
};
