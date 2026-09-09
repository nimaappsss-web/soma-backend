import { Response } from "express";
import { AuthRequest } from "../../types";
import { createErrorResponse } from "../../utils/errorHandler";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { approveSchoolById } from "../../services/schoolApproval";

export const approveSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await approveSchoolById(id, getFrontendUrl(req));

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({ message: "School approved", school: result.school });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Approve School");
    res.status(errorResponse.status).json(errorResponse);
  }
};