import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createLocalUser, randomPasswordHash, uniqueEmail, uniqueUsername } from "@/lib/services/users";
import { regenerateSyncToken } from "./sync-token";

export interface LinkInput {
  serverId: string;
  serverName?: string | null;
  jellyfinUserId: string;
  username: string;
}

/** Issue a fresh single-use login code, replacing the user's previous unused one. */
export async function issueClaimCode(userId: string): Promise<string> {
  await db.claimCode.deleteMany({ where: { userId, usedAt: null } });
  const code = randomBytes(24).toString("base64url");
  await db.claimCode.create({ data: { code, userId, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
  return code;
}

/** Link a Jellyfin identity to an authenticated account; returns a fresh login code. */
export async function linkExistingAccount(userId: string, input: LinkInput): Promise<string> {
  await db.user.update({
    where: { id: userId },
    data: { jellyfinUserId: input.jellyfinUserId, jellyfinServerId: input.serverId },
  });
  return issueClaimCode(userId);
}

export type BootstrapResult =
  | { mode: "bootstrap"; token: string; claimCode: string; created: boolean }
  | { mode: "already_linked" };

/**
 * Find-or-create the Jellyboxd account for a Jellyfin user (keyed by
 * server + user id). Returns a sync token + a login code. If the account already
 * has a token (claimed), we don't hand out new credentials (anti-takeover).
 */
export async function bootstrapJellyfinAccount(input: LinkInput): Promise<BootstrapResult> {
  const existing = await db.user.findFirst({
    where: { jellyfinServerId: input.serverId, jellyfinUserId: input.jellyfinUserId },
    select: { id: true, syncTokenHash: true },
  });

  if (existing?.syncTokenHash) {
    return { mode: "already_linked" };
  }

  let userId = existing?.id ?? null;
  let created = false;
  if (!userId) {
    const username = await uniqueUsername(input.username);
    const email = await uniqueEmail(username);
    const user = await createLocalUser({
      email,
      username,
      name: input.username,
      passwordHash: await randomPasswordHash(),
      jellyfinUserId: input.jellyfinUserId,
    });
    await db.user.update({ where: { id: user.id }, data: { jellyfinServerId: input.serverId } });
    userId = user.id;
    created = true;
  }

  const token = await regenerateSyncToken(userId);
  const claimCode = await issueClaimCode(userId);
  return { mode: "bootstrap", token, claimCode, created };
}

/** Consume a claim code and return the user id to log in, or null if invalid. */
export async function consumeClaimCode(code: string): Promise<string | null> {
  const row = await db.claimCode.findUnique({
    where: { code },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await db.claimCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}
