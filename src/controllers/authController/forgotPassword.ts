import { Response } from "express";
import { AuthRequest, ForgotPasswordDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendPasswordResetEmail } from "../../utils/email";
import crypto from "crypto";

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email }: ForgotPasswordDto = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.json({
        message: "If email exists, password reset link has been sent",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(user.email!, user.name || "User", token);

    res.json({
      message: "If email exists, password reset link has been sent",
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Forgot Password");
    res.status(errorResponse.status).json(errorResponse);
  }
};
