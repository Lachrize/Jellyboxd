import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Per-user sync token. The Jellyfin plugin on a user's own server presents this
 * as `Authorization: Bearer <token>` so Jellyboxd can attribute inbound events
 * to the right account (no username guessing across servers). Only the SHA-256
 * hash is stored; the raw token is shown once at generation.
 */

export function generateSyncToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSyncToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SyncTokenOwner {
  userId: string;
  jellyfinUserId: string | null;
}

/** Resolve the owning user from an `Authorization: Bearer <token>` header. */
export async function resolveUserBySyncToken(authHeader: string | null): Promise<SyncTokenOwner | null> {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;

  const user = await db.user.findUnique({
    where: { syncTokenHash: hashSyncToken(token) },
    select: { id: true, jellyfinUserId: true },
  });
  return user ? { userId: user.id, jellyfinUserId: user.jellyfinUserId } : null;
}

/** Create a fresh token for the user, persist its hash, return the raw token. */
export async function regenerateSyncToken(userId: string): Promise<string> {
  const token = generateSyncToken();
  await db.user.update({ where: { id: userId }, data: { syncTokenHash: hashSyncToken(token) } });
  return token;
}

export async function hasSyncToken(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { syncTokenHash: true } });
  return Boolean(user?.syncTokenHash);
}
