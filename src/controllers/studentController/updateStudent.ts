import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, classId, gender, dateOfBirth, address, imageUrl, parentName, parentPhone, parentEmail, status, updatedAt } = req.body;

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: {
        id: true,
        updatedAt: true,
        admissionNo: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Conflict detection: if client sends updatedAt, reject if server's record is newer
    if (updatedAt) {
      const clientTime = new Date(updatedAt).getTime();
      const serverTime = student.updatedAt.getTime();
      if (serverTime > clientTime) {
        return res.status(409).json({
          error: "Conflict",
          message: "This record was modified by another device. Refresh and try again.",
          serverUpdatedAt: student.updatedAt,
        });
      }
    }

    const updated = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(classId !== undefined ? { classId } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(parentName !== undefined ? { parentName } : {}),
        ...(parentPhone !== undefined ? { parentPhone } : {}),
        ...(parentEmail !== undefined ? { parentEmail } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        classId: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        imageUrl: true,
        parentName: true,
        parentPhone: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        syncStatus: true,
        syncedAt: true,
        version: true,
      },
    });

    res.json({ student: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Student");
    res.status(errorResponse.status).json(errorResponse);
  }
};
