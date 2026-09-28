import { db } from "./db";

// An invite that can still be used: not accepted, revoked or expired.
export async function findOpenInvite(token: string) {
  const inv = await db.staffInvite.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) return null;
  return inv;
}
