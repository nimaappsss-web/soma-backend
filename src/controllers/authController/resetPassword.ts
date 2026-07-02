import { Response } from "express";
import { AuthRequest, ResetPasswordDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePassword, hashPassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { token, password }: ResetPasswordDto = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(404).json({ error: "Invalid reset token" });
    }

    if (resetToken.usedAt) {
      return res.status(400).json({ error: "Reset token already used" });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: hashedPassword },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    res.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Reset Password");
    res.status(errorResponse.status).json(errorResponse);
  }
};
