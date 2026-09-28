export interface ErrorResponse {
  error: string;
  message?: string;
  status: number;
  timestamp?: string;
}

const DB_UNAVAILABLE_MESSAGE =
  "Unable to reach the database. Please check your connection and try again.";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again in a moment.";

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

/** Maps Prisma error codes to plain-language messages a user can act on. */
const PRISMA_FRIENDLY: Record<string, string> = {
  P2000: "The value provided is too long for one of the fields.",
  P2002: "That record already exists. Please use a different value.",
  P2003: "This action can't be completed because other records depend on it.",
  P2004: "The request conflicts with existing records.",
  P2011: "A required field is missing.",
  P2012: "A required value is missing.",
  P2025: "The record you're looking for no longer exists. It may have been removed.",
  P2034: "Please try the action again — the data changed at the same time.",
};

const toFriendlyMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null;
  const message = error.message ?? "";

  if (message.includes("A student with this admission number already exists")) {
    return "A student with this admission number already exists.";
  }

  const code = (error as { code?: string | number }).code;
  if (typeof code === "string" && PRISMA_FRIENDLY[code]) {
    return PRISMA_FRIENDLY[code];
  }

  return null;
};

export const createErrorResponse = (
  error: unknown,
  context: string,
  defaultStatus: number = 500,
): ErrorResponse => {
  const isDbError = isDatabaseError(error);
  const friendly = toFriendlyMessage(error);

  console.error(`[${context}] Error:`, {
    message: error instanceof Error ? error.message : error,
    error: error instanceof Error ? error.stack : error,
    timestamp: new Date().toISOString(),
  });

  // Never leak raw/internal messages for unhandled 500s — clients get a clean
  // generic message (the full detail stays in the server log above). Explicit
  // 4xx messages thrown from controllers are preserved as-is.
  let exposedMessage: string;
  if (isDbError) {
    exposedMessage = DB_UNAVAILABLE_MESSAGE;
  } else if (friendly) {
    exposedMessage = friendly;
  } else if (defaultStatus < 500 && error instanceof Error && error.message) {
    exposedMessage = error.message;
  } else {
    exposedMessage = GENERIC_ERROR_MESSAGE;
  }

  return {
    error: exposedMessage,
    message: exposedMessage,
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
