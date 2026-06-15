import { db } from "@/lib/db";
import { createLocalUser, randomPasswordHash, uniqueUsername } from "@/lib/services/users";
import { avatarPathFor } from "./avatar";
import { buildConfig } from "./config";
import type { JellyfinUser } from "./client";

export interface JellyfinProvisionContext {
  baseUrl: string;
  apiKey: string;
  serverId: string;
  serverName: string;
}

export interface ProvisionedJellyfinUser {
  userId: string;
  created: boolean;
  isAdmin: boolean;
}

export function isJellyfinAdmin(user: JellyfinUser): boolean {
  return Boolean(user.Policy?.IsAdministrator);
}

export async function provisionJellyfinUser(
  jellyfinUser: JellyfinUser,
  context: JellyfinProvisionContext,
): Promise<ProvisionedJellyfinUser> {
  const isAdmin = isJellyfinAdmin(jellyfinUser);
  // Match by jellyfinUserId alone (not serverId): the sync endpoints auto-create
  // accounts keyed only by jellyfinUserId (no serverId), so requiring a serverId
  // match here would miss them and create a DUPLICATE account for the same
  // Jellyfin user. The update below (re)sets serverId. A Jellyfin user maps to
  // exactly one Jellyboxd account.
  const existing = await db.user.findFirst({
    where: { jellyfinUserId: jellyfinUser.Id },
    select: { id: true },
  });

  let userId = existing?.id ?? null;
  let created = false;

  if (!userId) {
    const username = await uniqueUsername(jellyfinUser.Name);
    const user = await createLocalUser({
      username,
      name: jellyfinUser.Name,
      passwordHash: await randomPasswordHash(),
      jellyfinUserId: jellyfinUser.Id,
    });
    userId = user.id;
    created = true;
  }

  // NOTE: name/avatar/isAdmin are re-synced from Jellyfin on EVERY login. The
  // Jellyfin server is the source of truth for admin rights (Jellyseerr model),
  // so a Jellyboxd-side demotion is undone next time the user signs in if they
  // are still a Jellyfin admin. Demote in Jellyfin to make it stick.
  await db.user.update({
    where: { id: userId },
    data: {
      name: jellyfinUser.Name,
      avatarUrl: avatarPathFor(jellyfinUser),
      jellyfinUserId: jellyfinUser.Id,
      jellyfinServerId: context.serverId,
      isAdmin,
    },
  });

  const config = buildConfig({
    apiKey: context.apiKey,
    jellyfinUserId: jellyfinUser.Id,
    jellyfinUserName: jellyfinUser.Name,
    serverId: context.serverId,
  });

  const source = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN" },
    select: { id: true },
  });

  if (source) {
    await db.importSource.update({
      where: { id: source.id },
      data: {
        name: context.serverName,
        baseUrl: context.baseUrl,
        status: "CONNECTED",
        config,
      },
    });
  } else {
    await db.importSource.create({
      data: {
        userId,
        kind: "JELLYFIN",
        name: context.serverName,
        baseUrl: context.baseUrl,
        status: "CONNECTED",
        config,
      },
    });
  }

  return { userId, created, isAdmin };
}

export async function provisionJellyfinUsers(
  users: JellyfinUser[],
  context: JellyfinProvisionContext,
): Promise<{ total: number; created: number; admins: number }> {
  let created = 0;
  let admins = 0;

  for (const user of users) {
    if (user.Policy?.IsDisabled) continue;
    const result = await provisionJellyfinUser(user, context);
    if (result.created) created += 1;
    if (result.isAdmin) admins += 1;
  }

  return { total: users.filter((user) => !user.Policy?.IsDisabled).length, created, admins };
}
