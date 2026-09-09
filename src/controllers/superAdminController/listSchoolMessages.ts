import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const listSchoolMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const messages = await prisma.schoolSupportMessage.findMany({
      where: { schoolId: id },
      select: {
        id: true,
        message: true,
        replyToId: true,
        createdAt: true,
        user: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ messages, count: messages.length });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin School Messages");
    res.status(errorResponse.status).json(errorResponse);
  }
};