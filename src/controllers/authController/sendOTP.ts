import { Response } from "express";

import { validatePhoneNumber, validateEmail } from "../../utils/validation";
import { createErrorResponse } from "../../utils/errorHandler";
import { sendEmailOtp } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { generateOTP } from "../../utils/tokens";
import { prisma } from "../../utils/prisma";
import { AuthRequest } from "../../types";
import { localPhoneNumber } from "../../utils/whatsapp";

export const sendOTP = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email } = req.body;

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (phone) {
      if (!validatePhoneNumber(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      const normalizedPhone = localPhoneNumber(phone);

      const user = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { email: true, name: true },
      });

      if (!user?.email) {
        return res.status(400).json({
          error:
            "No email on file for this phone. Please log in with your email instead.",
        });
      }

      await prisma.oTP.deleteMany({
        where: { phone: normalizedPhone, verified: false },
      });

      await prisma.oTP.create({
        data: { phone: normalizedPhone, code, expiresAt },
      });

      try {
        await sendEmailOtp(user.email, user.name || "User", code, getFrontendUrl(req));
        console.log(`OTP email sent successfully to ${user.email}`);
      } catch (err: any) {
        console.error("Send email OTP error:", err?.message || err);
        if (err?.response) console.error("Error response:", err.response);
        return res.status(500).json({
          error: "Failed to send email",
          detail: err?.message || "Unknown error",
        });
      }
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
      try {
        await sendEmailOtp(email, user?.name || "User", code, getFrontendUrl(req));
        console.log(`OTP email sent successfully to ${email}`);
      } catch (err: any) {
        console.error("Send email OTP error:", err?.message || err);
        if (err?.response) console.error("Error response:", err.response);
        return res.status(500).json({
          error: "Failed to send email",
          detail: err?.message || "Unknown error",
        });
      }
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