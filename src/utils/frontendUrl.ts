import { Request } from "express";

// Resolve which frontend URL email/WhatsApp links should point to.
// The canonical FRONTEND_URL env var always wins so links use the real
// domain even when visitors arrive via an old deployment alias or send a
// different origin header. Falls back to the requesting frontend's origin
// (X-Frontend-Origin) so localhost dev still works when FRONTEND_URL is unset.
export const getFrontendUrl = (req?: Request): string => {
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }
  const fromHeader = req?.headers?.["x-frontend-origin"];
  if (typeof fromHeader === "string" && fromHeader.startsWith("http")) {
    return fromHeader.replace(/\/+$/, "");
  }
  return "http://localhost:5173";
};