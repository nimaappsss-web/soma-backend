import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import crypto from "crypto";

export const inviteParent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, studentId } = req.body;

    if (!name || !email || !studentId) {
      return res.status(400).json({ error: "name, email, and studentId are required" });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.user.schoolId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, schoolId: req.user.schoolId, role: "PARENT" },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A parent with this email already exists" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.inviteToken.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token,
        invitedName: name,
        invitedEmail: email,
        role: "PARENT",
        expiresAt,
      },
    });

    await prisma.student.update({
      where: { id: studentId },
      data: {
        parentName: name,
        parentEmail: email,
      },
    });

    res.status(201).json({
      invite: {
        id: invite.id,
        invitedName: name,
        invitedEmail: email,
        role: "PARENT",
        expiresAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Parent");
    res.status(errorResponse.status).json(errorResponse);
  }
};
