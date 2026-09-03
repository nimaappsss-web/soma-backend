import { Request } from "express";

// Resolve which frontend URL email/WhatsApp links should point to.
// The requesting frontend's origin (X-Frontend-Origin header, sent by the app
// as window.location.origin) always wins so links point to the exact frontend
// the user is on — dev builds get localhost links, production gets the real
// domain. Falls back to FRONTEND_URL (or localhost) when the header is absent
// (e.g. server-generated email with no originating frontend request).
export const getFrontendUrl = (req?: Request): string => {
  const fromHeader = req?.headers?.["x-frontend-origin"];
  if (typeof fromHeader === "string" && fromHeader.startsWith("http")) {
    return fromHeader.replace(/\/+$/, "");
  }
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }
  return "http://localhost:5173";
};
