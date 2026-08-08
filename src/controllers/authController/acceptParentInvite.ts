import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { hashPassword, validatePassword } from "../../utils/password";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";

export const acceptParentInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token, password, name } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
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

    if (inviteToken.role !== "PARENT") {
      return res.status(400).json({ error: "This endpoint is for parent invites only" });
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

    // Check if user already exists (was created by an older version or another flow)
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser && existingUser.passwordHash) {
      return res.status(400).json({ error: "Account already set up" });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      let user = existingUser;

      if (!user) {
        user = await tx.user.create({
          data: {
            name: name || inviteToken.invitedName || "Parent",
            email,
            role: "PARENT",
            schoolId: inviteToken.schoolId,
            passwordHash,
            emailVerified: true,
            active: true,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, emailVerified: true },
        });
      }

      await tx.inviteToken.update({
        where: { id: inviteToken.id },
        data: { usedAt: new Date(), usedBy: user.id },
      });

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

    await prisma.session.create({
      data: {
        userId: result.id,
        deviceId: req.body.deviceId || crypto.randomUUID(),
        deviceType: "web",
        deviceName: req.body.deviceName || "Web Browser",
        refreshToken,
        isPrimary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: "Parent account set up successfully",
      accessToken,
      refreshToken,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        schoolId: result.schoolId,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Accept Parent Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
