import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, phone, gender, role, department, designation } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: "Name and role are required" });
    }

    const staff = await prisma.staff.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        email: email || null,
        phone: phone || null,
        gender: gender || null,
        role,
        department: department || null,
        designation: designation || null,
      },
    });

    res.status(201).json({ staff });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
