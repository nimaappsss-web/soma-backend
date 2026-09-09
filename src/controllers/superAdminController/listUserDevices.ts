import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";

export const listUserDevices = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const sessions = await prisma.session.findMany({
      where: { userId: id },
      orderBy: { lastActivityAt: "desc" },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        isPrimary: true,
        lastActivityAt: true,
      },
    });

    res.json({
      devices: sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        deviceType: s.deviceType,
        isPrimary: s.isPrimary,
        lastActivityAt: s.lastActivityAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[listUserDevices] failed:", error);
    res.status(500).json({ error: "Could not load devices." });
  }
};