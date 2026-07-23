import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validateEmail, validatePhoneNumber } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";

export const checkIdentifier = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    const isEmail = validateEmail(identifier);
    const isPhone = validatePhoneNumber(identifier);

    if (!isEmail && !isPhone) {
      return res.status(400).json({ error: "Invalid email or phone format" });
    }

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
      select: { name: true, passwordHash: true, emailVerified: true, active: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      exists: true,
      name: user.name,
      hasPassword: !!user.passwordHash,
      emailVerified: user.emailVerified,
      active: user.active,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Check Identifier");
    res.status(errorResponse.status).json(errorResponse);
  }
};
