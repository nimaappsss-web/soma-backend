import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../utils/prisma";
import { getSupportEmail } from "../utils/platformNotify";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Only the dashboard stats endpoint stays reachable while a school is
// deactivated — everything else (writes and reads alike) is blocked with
// SCHOOL_DEACTIVATED. The app shows a full-screen lock in that state.
const DEACTIVATED_READ_ALLOW = ["/api/dashboard"];

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
    if (!school) {
      return next();
    }

    // DEACTIVATED (approved but inactive): allow only the read whitelist so the
    // dashboard/notice still render; block every write and every other list.
    if (!school.active) {
      const url = req.originalUrl ?? "";
      const isRead = READ_METHODS.has(req.method.toUpperCase());
      const isAllowed = isRead && DEACTIVATED_READ_ALLOW.some((p) => url.startsWith(p));
      if (!isAllowed) {
        const supportEmail = await getSupportEmail();
        return res.status(403).json({
          error:
            "Your school account has been deactivated. Please renew your subscription to continue using Soma.",
          code: "SCHOOL_DEACTIVATED",
          supportEmail,
        });
      }
      return next();
    }

    if (school.approvalStatus === "APPROVED") {
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