import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { generateSecureToken } from "../../utils/tokens";
import { sendTeacherInviteEmail } from "../../utils/email";
import { createErrorResponse } from "../../utils/errorHandler";

export const inviteTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role !== "PRINCIPAL") {
      return res
        .status(403)
        .json({ error: "Only principals can invite teachers" });
    }

    if (!req.user.schoolId) {
      return res.status(400).json({ error: "No school registered yet" });
    }

    const { teacherEmail, role } = req.body;

    if (!teacherEmail) {
      return res.status(400).json({ error: "Teacher email is required" });
    }

    if (!validateEmail(teacherEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: teacherEmail },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Teacher with this email already exists" });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.inviteToken.create({
      data: {
        schoolId: req.user.schoolId,
        invitedBy: req.user.userId,
        token,
        invitedEmail: teacherEmail,
        invitedName: "Teacher",
        role: role || "TEACHER",
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "https://soma-frontend-zeta.vercel.app";
    const inviteLink = `${frontendUrl}/verify-teacher?token=${token}`;

    try {
      await sendTeacherInviteEmail(teacherEmail, school.name, inviteLink);
    } catch (err: any) {
      console.error("Failed to send invite email:", err?.message || err);
    }

    res.status(201).json({
      message: "Invite sent successfully",
      invite: {
        teacherEmail,
        role: role || "TEACHER",
        expiresAt,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Invite Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
