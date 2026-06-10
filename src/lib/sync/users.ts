import { db } from "@/lib/db";
import { createLocalUser, randomPasswordHash, uniqueEmail, uniqueUsername } from "@/lib/services/users";

/**
 * Map a Jellyfin user id to the Jellyboxd account, creating it on first sight.
 * This is what lets any Jellyfin user (e.g. a grandparent) start syncing with
 * zero setup: the first event/pull for them provisions their account.
 */
export async function resolveOrCreateJellyboxdUser(
  jellyfinUserId: string,
  opts: { username?: string | null; serverId?: string | null } = {},
): Promise<{ id: string }> {
  const existing = await db.user.findFirst({
    where: { jellyfinUserId },
    select: { id: true },
  });
  if (existing) return existing;

  const name = opts.username?.trim() || `jf_${jellyfinUserId.slice(0, 8)}`;
  const created = await createLocalUser({
    email: await uniqueEmail(name),
    username: await uniqueUsername(name),
    name,
    passwordHash: await randomPasswordHash(),
    jellyfinUserId,
  });
  if (opts.serverId) {
    await db.user.update({ where: { id: created.id }, data: { jellyfinServerId: opts.serverId } });
  }
  return { id: created.id };
}
