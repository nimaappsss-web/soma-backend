export interface ErrorResponse {
  error: string;
  status: number;
  timestamp?: string;
}

export const createErrorResponse = (
  error: unknown,
  context: string,
  defaultStatus: number = 500,
): ErrorResponse => {
  const message = error instanceof Error ? error.message : "An error occurred";

  console.error(`[${context}] Error:`, {
    message,
    error: error instanceof Error ? error.stack : error,
    timestamp: new Date().toISOString(),
  });

  return {
    error: process.env.NODE_ENV === "production" ? "An unexpected error occurred. Please try again." : message,
    status: defaultStatus,
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
