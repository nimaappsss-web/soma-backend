import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import crypto from "crypto";

export const inviteStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, phone, role, department, designation } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, schoolId: req.user.schoolId },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const staff = await prisma.staff.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        email,
        phone: phone || null,
        role: role || "STAFF",
        department: department || null,
        designation: designation || null,
        status: "INVITED",
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token,
        invitedName: name,
        invitedEmail: email,
        role: "STAFF",
        expiresAt,
      },
    });

    res.status(201).json({ staff });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Staff");
    res.status(errorResponse.status).json(errorResponse);
  }
};
