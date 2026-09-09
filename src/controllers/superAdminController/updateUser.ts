import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { validateEmail } from "../../utils/validation";

const ALLOWED_ROLES = [
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "TEACHER",
  "BURSAR",
  "STAFF",
  "PARENT",
  "SUPER_ADMIN",
];

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { active, role, approvalStatus, schoolId, name, email, phone } = req.body;

    if (role && !ALLOWED_ROLES.includes(String(role).toUpperCase())) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (email !== undefined && email !== null && !validateEmail(String(email))) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (approvalStatus && !["APPROVED", "PENDING", "REJECTED"].includes(String(approvalStatus).toUpperCase())) {
      return res.status(400).json({ error: "Invalid approval status" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(active !== undefined ? { active: !!active } : {}),
        ...(role !== undefined ? { role: String(role).toUpperCase() } : {}),
        ...(approvalStatus !== undefined
          ? { approvalStatus: String(approvalStatus).toUpperCase() }
          : {}),
        ...(schoolId !== undefined ? { schoolId: schoolId || null } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        approvalStatus: true,
        emailVerified: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true,
        school: { select: { id: true, name: true } },
      },
    });

    res.json({
      message: "User updated successfully",
      user: updated,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Update User");
    res.status(errorResponse.status).json(errorResponse);
  }
};