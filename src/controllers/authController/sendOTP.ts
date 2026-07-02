import { Response } from "express";
import { AuthRequest, SendOTPDto } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePhoneNumber } from "../../utils/validation";
import { generateOTP } from "../../utils/tokens";
import { createErrorResponse } from "../../utils/errorHandler";

export const sendOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phone }: SendOTPDto = req.body;

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.deleteMany({
      where: {
        phone,
        verified: false,
      },
    });

    await prisma.oTP.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    console.log(`OTP for ${phone}: ${code}`);

    res.json({
      message: "OTP sent successfully",
      expiresIn: 600,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Send OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
