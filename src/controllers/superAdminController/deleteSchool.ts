import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { comparePassword } from "../../utils/password";
import { createErrorResponse } from "../../utils/errorHandler";

export const deleteSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body ?? {};

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!password) {
      return res
        .status(400)
        .json({ error: "Admin password is required to delete a school." });
    }

    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { passwordHash: true },
    });

    if (!admin?.passwordHash) {
      return res.status(400).json({ error: "Cannot verify admin password for this account" });
    }

    const isValid = await comparePassword(password, admin.passwordHash);
    if (!isValid) {
      return res.status(403).json({ error: "Incorrect admin password." });
    }

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    await prisma.school.delete({ where: { id } });

    res.json({
      message: `School "${school.name}" deleted successfully`,
      deletedId: id,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Delete School");
    res.status(errorResponse.status).json(errorResponse);
  }
};