import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: err.message,
      message: err.message,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      error: "Please sign in to continue.",
      message: "Please sign in to continue.",
    });
  }

  res.status(500).json({
    error: "Something went wrong. Please try again in a moment.",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
