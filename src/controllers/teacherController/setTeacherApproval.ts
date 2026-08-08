import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const VALID_STATUSES = ["APPROVED", "REJECTED"];

export const setTeacherApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
    }

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId: req.user.schoolId,
        role: { in: ["TEACHER", "BURSAR"] },
      },
      select: { id: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: status,
        active: status === "APPROVED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        approvalStatus: true,
        formClassId: true,
      },
    });

    res.json({
      message: status === "APPROVED" ? "Teacher approved" : "Teacher rejected",
      teacher: updated,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Set Teacher Approval");
    res.status(errorResponse.status).json(errorResponse);
  }
};