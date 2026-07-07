import { Response } from "express";

import { verifyToken, generateAccessToken } from "../../utils/jwt";
import { createErrorResponse } from "../../utils/errorHandler";
import { AuthRequest, RefreshTokenDto } from "../../types";
import { prisma } from "../../utils/prisma";

export const refresh = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenDto = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = verifyToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.active) {
      return res.status(403).json({ error: "User not found or inactive" });
    }

    const session = await prisma.session.findFirst({
      where: {
        userId: decoded.userId,
        refreshToken,
      },
    });

    if (!session) {
      const latestSession = await prisma.session.findFirst({
        where: { userId: decoded.userId },
        orderBy: { lastActivityAt: "desc" },
      });

      if (latestSession) {
        const newAccessToken = generateAccessToken({
          userId: user.id,
          schoolId: user.schoolId || undefined,
          role: user.role,
          email: user.email || undefined,
        });

        await prisma.session.update({
          where: { id: latestSession.id },
          data: { lastActivityAt: new Date() },
        });

        return res.json({
          accessToken: newAccessToken,
          refreshToken: latestSession.refreshToken,
        });
      }

      return res.status(403).json({ error: "No session found" });
    }

    if (session.expiresAt < new Date()) {
      return res.status(403).json({ error: "Refresh token expired" });
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      schoolId: user.schoolId || undefined,
      role: user.role,
      email: user.email || undefined,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Refresh Token", 403);
    res.status(errorResponse.status).json(errorResponse);
  }
};
