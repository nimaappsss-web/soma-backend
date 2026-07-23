import { Response } from "express";
import { AuthRequest } from "../../types";
import { validateEmail } from "../../utils/validation";
import { generateRegistrationToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { prisma } from "../../utils/prisma";

export const verifyRegistrationOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
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
      return res.status(401).json({ error: "Invalid or expired verification code" });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const registrationToken = generateRegistrationToken(email);

    res.json({
      message: "Email verified successfully. Please complete your profile.",
      registrationToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Verify Registration OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
