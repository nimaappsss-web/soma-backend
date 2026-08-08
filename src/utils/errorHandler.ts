export interface ErrorResponse {
  error: string;
  status: number;
  timestamp?: string;
}

const DB_UNAVAILABLE_MESSAGE =
  "Unable to reach the database. Please check your connection and try again.";

const isDatabaseError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const name = error.name ?? "";
  const message = error.message ?? "";
  const code = (error as { code?: string | number }).code;

  if (name.includes("PrismaClientInitialization") || name.includes("PrismaClientRustPanic")) {
    return true;
  }
  if (typeof code === "string" && /^P1\d{3}$/.test(code)) {
    return true;
  }
  return /can't reach database server|connection(?: error| refused)|database (?:server )?unavailable|timeout|ECONNREFUSED/i.test(
    message,
  );
};

export const createErrorResponse = (
  error: unknown,
  context: string,
  defaultStatus: number = 500,
): ErrorResponse => {
  const isDbError = isDatabaseError(error);
  const message = isDbError
    ? DB_UNAVAILABLE_MESSAGE
    : error instanceof Error
      ? error.message
      : "An error occurred";

  console.error(`[${context}] Error:`, {
    message: error instanceof Error ? error.message : error,
    error: error instanceof Error ? error.stack : error,
    timestamp: new Date().toISOString(),
  });

  return {
    error: message,
    status: isDbError ? 503 : defaultStatus,
    timestamp: new Date().toISOString(),
  };
};

export const logError = (context: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[${context}] Error:`, {
    message,
    error,
    timestamp: new Date().toISOString(),
  });
};
