import { Response } from "express";
import { createErrorResponse } from "../../utils/errorHandler";
import { validateEmail } from "../../utils/validation";
import { prisma } from "../../utils/prisma";
import { AuthRequest } from "../../types";

export const verifyEmailOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "OTP code is required" });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Email OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
