import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";

export const listDevices = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.userId },
      orderBy: { lastActivityAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
        isPrimary: true,
        lastActivityAt: true,
      },
    });

    const currentDeviceId = req.headers["x-device-id"] as string | undefined;

    res.json({
      devices: sessions.map((s) => ({
        id: s.id,
        deviceId: s.deviceId,
        deviceName: s.deviceName,
        deviceType: s.deviceType,
        isPrimary: s.isPrimary,
        lastActivityAt: s.lastActivityAt.toISOString(),
        current: !!currentDeviceId && s.deviceId === currentDeviceId,
      })),
    });
  } catch (error) {
    console.error("[listDevices] failed:", error);
    res.status(500).json({ error: "Could not load devices." });
  }
};