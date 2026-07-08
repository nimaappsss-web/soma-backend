import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const myFormClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        formClassId: true,
        formClass: { select: { id: true, name: true, level: true, arm: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      formClassId: user.formClassId,
      formClass: user.formClass || null,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "My Form Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
