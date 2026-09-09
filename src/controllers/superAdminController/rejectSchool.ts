import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { rejectSchoolById } from "../../services/schoolApproval";

export const rejectSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await rejectSchoolById(id, reason);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({ message: "School rejected", school: result.school });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Reject School");
    res.status(errorResponse.status).json(errorResponse);
  }
};