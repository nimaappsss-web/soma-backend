import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

const DEACTIVATION_REASONS = new Set(["NOT_PAID", "VIOLATED_REGULATION", "CUSTOM"]);

export const updateSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, state, lga, schoolType, arms, logo, active, schoolCode, deactivationReason, deactivationNote } = req.body;

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, principalId: true },
    });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    if (deactivationReason !== undefined && !DEACTIVATION_REASONS.has(deactivationReason)) {
      return res.status(400).json({ error: "Invalid deactivation reason" });
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
        ...(schoolType !== undefined
          ? { schoolType: JSON.stringify(schoolType) }
          : {}),
        ...(arms !== undefined ? { arms: JSON.stringify(arms || []) } : {}),
        // Deactivating stores the reason; activating clears it.
        ...(active !== undefined
          ? active
            ? { active: true, deactivationReason: null, deactivationNote: null }
            : {
                active: false,
                deactivationReason: deactivationReason ?? "CUSTOM",
                deactivationNote:
                  deactivationReason === "CUSTOM"
                    ? deactivationNote?.trim() || null
                    : null,
              }
          : deactivationReason !== undefined
            ? { deactivationReason, deactivationNote: deactivationNote?.trim() || null }
            : {}),
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
        approvalStatus: true,
        deactivationReason: true,
        deactivationNote: true,
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