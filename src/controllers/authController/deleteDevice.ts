import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";

export const deleteDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!session || session.userId !== req.user!.userId) {
      return res.status(404).json({ error: "Device not found." });
    }

    await prisma.session.delete({ where: { id } });
    res.json({ message: "Device logged out." });
  } catch (error) {
    console.error("[deleteDevice] failed:", error);
    res.status(500).json({ error: "Could not log out device." });
  }
};