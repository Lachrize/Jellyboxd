import { JellyfinClient } from "./client";
import { getPrimaryJellyfinServer } from "./config";
import { provisionJellyfinUsers } from "./users";

export interface SyncJellyfinUsersResult {
  ok: boolean;
  reason?: string;
  total?: number;
  created?: number;
  admins?: number;
}

/**
 * Pull the current Jellyfin user list from the primary (admin-owned) server and
 * provision any missing accounts. This is what the hourly background job calls
 * so that users added in Jellyfin show up in Jellyboxd without anyone having to
 * log in or re-run the connection from settings.
 */
export async function syncJellyfinUsersFromPrimary(): Promise<SyncJellyfinUsersResult> {
  const server = await getPrimaryJellyfinServer();
  if (!server) return { ok: false, reason: "no-primary-server" };

  try {
    const client = new JellyfinClient(server.baseUrl, server.apiKey);
    const users = await client.getUsers();
    const result = await provisionJellyfinUsers(users, {
      baseUrl: server.baseUrl,
      apiKey: server.apiKey,
      serverId: server.serverId,
      serverName: server.name,
    });
    return { ok: true, ...result };
  } catch (error) {
    console.error("[jellyboxd] hourly user sync failed:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "unknown" };
  }
}
