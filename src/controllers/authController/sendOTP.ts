import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { validatePhoneNumber, validateEmail } from "../../utils/validation";
import { generateOTP } from "../../utils/tokens";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendEmailOtp } from "../../utils/email";

export const sendOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email } = req.body;

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (phone) {
      if (!validatePhoneNumber(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      await prisma.oTP.deleteMany({
        where: { phone, verified: false },
      });

      await prisma.oTP.create({
        data: { phone, code, expiresAt },
      });

      console.log(`OTP for ${phone}: ${code}`);
    } else if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      await prisma.oTP.deleteMany({
        where: { email, verified: false },
      });

      await prisma.oTP.create({
        data: { email, code, expiresAt },
      });

      const user = await prisma.user.findFirst({ where: { email } });
      sendEmailOtp(email, user?.name || "User", code).catch(() => {});
    } else {
      return res.status(400).json({ error: "Phone or email is required" });
    }

    res.json({
      message: "OTP sent successfully",
      expiresIn: 600,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Send OTP");
    res.status(errorResponse.status).json(errorResponse);
  }
};
