import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const updateSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, state, lga, schoolType, arms, logo, active, schoolCode } = req.body;

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, principalId: true },
    });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(lga !== undefined ? { lga } : {}),
        ...(schoolCode !== undefined ? { schoolCode: String(schoolCode).toUpperCase() } : {}),
        ...(logo !== undefined ? { logo: logo || null } : {}),
        ...(active !== undefined ? { active: !!active } : {}),
        ...(schoolType !== undefined
          ? { schoolType: JSON.stringify(schoolType) }
          : {}),
        ...(arms !== undefined ? { arms: JSON.stringify(arms || []) } : {}),
      },
      select: {
        id: true,
        name: true,
        schoolCode: true,
        address: true,
        state: true,
        lga: true,
        schoolType: true,
        logo: true,
        arms: true,
        active: true,
        principalId: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "School updated successfully",
      school: {
        ...updated,
        schoolType: JSON.parse(updated.schoolType),
        arms: JSON.parse(updated.arms),
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Update School");
    res.status(errorResponse.status).json(errorResponse);
  }
};