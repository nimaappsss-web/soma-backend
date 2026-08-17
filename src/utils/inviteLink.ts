const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const buildInviteUrl = (
  path: string,
  token: string,
  opts?: { email?: string | null; phone?: string | null },
): string => {
  const params = new URLSearchParams({ token });
  if (opts?.email) params.set("email", opts.email);
  if (opts?.phone) params.set("phone", opts.phone);
  return `${FRONTEND_URL}${path}?${params.toString()}`;
};