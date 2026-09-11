import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { hashPassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

// No ambiguous characters (0/O, 1/I/l) so the temp password is easy to share.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

const generateTemporaryPassword = (length = 12): string => {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i] % CHARSET.length];
  }
  return out;
};

export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    // Set the new password and sign the user out everywhere so the old
    // credentials/sessions can't be replayed.
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    res.json({
      message: "Password reset successfully",
      temporaryPassword,
      note: "This password is shown once — share it securely and have the user change it after logging in.",
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Reset User Password");
    res.status(errorResponse.status).json(errorResponse);
  }
};