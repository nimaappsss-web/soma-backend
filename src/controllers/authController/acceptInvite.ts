import { Response } from "express";
import { AuthRequest, AcceptInviteDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePhoneNumber } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token, phone }: AcceptInviteDto = req.body;

    if (!token || !phone) {
      return res
        .status(400)
        .json({ error: "Token and phone number are required" });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });

    if (!inviteToken) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    if (inviteToken.usedAt) {
      return res.status(400).json({ error: "Invite code already used" });
    }

    if (inviteToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invite code expired" });
    }

    if (inviteToken.invitedPhone !== phone) {
      return res
        .status(400)
        .json({ error: "Phone number does not match invite" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    const user = await prisma.user.create({
      data: {
        name: inviteToken.invitedName || "Teacher",
        phone,
        email: inviteToken.invitedEmail || null,
        role: inviteToken.role,
        schoolId: inviteToken.schoolId,
        passwordHash: null,
        active: true,
      },
    });

    await prisma.inviteToken.update({
      where: { id: inviteToken.id },
      data: {
        usedAt: new Date(),
        usedBy: user.id,
      },
    });

    res.json({
      message: "Account created successfully. Please verify with OTP to login.",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Accept Invite");
    res.status(errorResponse.status).json(errorResponse);
  }
};
