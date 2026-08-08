import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { hashPassword, validatePassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

export const setPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.passwordHash) {
      return res.status(400).json({ error: "Password is already set" });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash },
    });

    res.json({ message: "Password set successfully" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Set Password");
    res.status(errorResponse.status).json(errorResponse);
  }
};