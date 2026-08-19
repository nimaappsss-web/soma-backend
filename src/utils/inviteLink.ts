export const buildInviteUrl = (
  path: string,
  token: string,
  opts?: { email?: string | null; phone?: string | null },
  frontendUrl?: string,
): string => {
  const base = (frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const params = new URLSearchParams({ token });
  if (opts?.email) params.set("email", opts.email);
  if (opts?.phone) params.set("phone", opts.phone);
  return `${base}${path}?${params.toString()}`;
};