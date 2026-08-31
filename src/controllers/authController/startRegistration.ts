import { Response } from "express";
import { AuthRequest } from "../../types";
import { validateEmail } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendEmailOtp } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { generateOTP, OTP_TTL_MS } from "../../utils/tokens";
import { prisma } from "../../utils/prisma";

export const startRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists. Please login." });
    }

    await prisma.oTP.deleteMany({
      where: { email, verified: false },
    });

    const otp = generateOTP();
    await prisma.oTP.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    try {
      await sendEmailOtp(email, "User", otp, getFrontendUrl(req));
    } catch (err: any) {
      return res.status(500).json({
        error: "Failed to send verification email. Please try again.",
      });
    }

    res.json({
      message: "Verification code sent to your email",
      expiresIn: 900,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Start Registration");
    res.status(errorResponse.status).json(errorResponse);
  }
};
