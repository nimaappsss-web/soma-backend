import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { comparePassword, hashPassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "Cannot change password for this account" });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Change Password");
    res.status(errorResponse.status).json(errorResponse);
  }
};
