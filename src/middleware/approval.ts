import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../utils/prisma";
import { getSupportEmail } from "../utils/platformNotify";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Approval turnstile for school-scoped APIs. Run AFTER authenticateToken.
//  - APPROVED / no school   -> pass
//  - PENDING                -> reads allowed (read-only preview), writes 403
//  - REJECTED               -> everything 403 with the stored reason
export const gateApproval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || !req.user.userId) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        school: {
          select: {
            approvalStatus: true,
            rejectionReason: true,
            active: true,
          },
        },
      },
    });

    const school = user?.school;
    if (!school || school.approvalStatus === "APPROVED") {
      return next();
    }

    if (school.approvalStatus === "REJECTED") {
      const supportEmail = await getSupportEmail();
      return res.status(403).json({
        error: school.rejectionReason
          ? `Your school was not approved. Reason: ${school.rejectionReason}`
          : "Your school was not approved. Please reach out to support.",
        code: "SCHOOL_REJECTED",
        reason: school.rejectionReason ?? null,
        supportEmail,
      });
    }

    // PENDING: read-only preview, no writes.
    if (!READ_METHODS.has(req.method.toUpperCase())) {
      return res.status(403).json({
        error:
          "Your account is under review. You can preview the app, but creating things unlocks once your school is approved.",
        code: "SCHOOL_PENDING",
      });
    }

    next();
  } catch (error) {
    // Fail closed: a DB hiccup must never silently unlock writes for an
    // unapproved school. Block the write and log so it surfaces loudly.
    console.error("[gateApproval] lookup failed, blocking write:", error);
    return res.status(403).json({
      error:
        "Your account is under review. You can preview the app, but creating things unlocks once your school is approved.",
      code: "SCHOOL_PENDING",
    });
  }
};