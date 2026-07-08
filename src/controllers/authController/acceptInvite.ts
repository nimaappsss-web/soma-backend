import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { hashPassword, validatePassword } from "../../utils/password";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token, name, password, formClassId, assignments } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "This invite has already been used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invite link has expired" });
    }

    const email = inviteToken.invitedEmail;
    if (!email) {
      return res.status(400).json({ error: "No email associated with this invite" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: inviteToken.role,
          schoolId: inviteToken.schoolId,
          passwordHash,
          emailVerified: true,
          active: true,
          formClassId: formClassId || null,
        },
        include: {
          formClass: { select: { id: true, name: true } },
        },
      });

      await tx.inviteToken.update({
        where: { id: inviteToken.id },
        data: { usedAt: new Date(), usedBy: user.id },
      });

      if (assignments && Array.isArray(assignments)) {
        for (const assignment of assignments) {
          const { subjectId, classIds } = assignment;

          if (!subjectId || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
            continue;
          }

          const teacherAssignment = await tx.teacherAssignment.create({
            data: {
              teacherId: user.id,
              schoolId: inviteToken.schoolId,
              type: "subject",
              subjectId,
            },
          });

          await tx.teacherAssignmentClass.createMany({
            data: classIds.map((classId: string) => ({
              assignmentId: teacherAssignment.id,
              classId,
            })),
          });
        }
      }

      return user;
    });

    const tokenPayload = {
      userId: result.id,
      schoolId: result.schoolId || undefined,
      role: result.role,
      email: result.email || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        schoolId: result.schoolId,
        formClassId: result.formClassId,
        formClass: result.formClass?.name || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Accept Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
