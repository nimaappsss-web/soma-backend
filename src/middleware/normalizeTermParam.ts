import type { RequestHandler } from "express";

/**
 * Exam-flow storage (ExamSession, ScoreComponent, CaBroadcast,
 * ExamSheetBroadcast, ExamResultDelivery) keys rows by term name
 * ("first" | "second" | "third"), while AcademicTerm stores "1" | "2" | "3".
 * Clients have sent both forms over time, so rewrite any incoming term param
 * to the canonical storage name before handlers run. Handlers that need the
 * AcademicTerm form already call normalizeTerm(), which maps names back.
 */
const STORAGE_TERMS: Record<string, string> = {
  "1": "first",
  "1st": "first",
  first: "first",
  "2": "second",
  "2nd": "second",
  second: "second",
  "3": "third",
  "3rd": "third",
  third: "third",
};

export const normalizeTermParam: RequestHandler = (req, _res, next) => {
  const map = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    return STORAGE_TERMS[value.toLowerCase()] ?? value;
  };

  if (req.query.term !== undefined) {
    req.query.term = map(req.query.term) as typeof req.query.term;
  }

  if (req.body && typeof req.body === "object" && !Array.isArray(req.body) && req.body.term !== undefined) {
    req.body.term = map(req.body.term);
  }

  next();
};
