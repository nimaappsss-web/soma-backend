import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    res.json({ message: "Logout successful" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Logout");
    res.status(errorResponse.status).json(errorResponse);
  }
};
