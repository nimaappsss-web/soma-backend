import { Request } from "express";

// Resolve which frontend URL email/WhatsApp links should point to.
// Prefers the origin of the actual requesting frontend (sent via the
// X-Frontend-Origin header) so localhost dev and the Vercel deployment each
// receive working links. Falls back to the FRONTEND_URL env var.
export const getFrontendUrl = (req?: Request): string => {
  const fromHeader = req?.headers?.["x-frontend-origin"];
  if (typeof fromHeader === "string" && fromHeader.startsWith("http")) {
    return fromHeader.replace(/\/+$/, "");
  }
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
};