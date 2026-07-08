import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const classRecord = await prisma.class.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    await prisma.class.delete({ where: { id } });

    res.json({ message: "Class deleted" });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Delete Class");
    res.status(errorResponse.status).json(errorResponse);
  }
};
