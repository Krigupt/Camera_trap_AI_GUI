/**
 * Comma-separated Clerk user IDs in ADMIN_USER_IDS (e.g. user_abc,user_def).
 * Only these accounts can access /admin and admin APIs.
 */
export function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return parseAdminUserIds().has(userId);
}
