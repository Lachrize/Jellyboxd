import { db } from "@/lib/db";
import { authenticateJellyfin, getJellyfinServerInfo } from "./client";

/**
 * A user's connection to THEIR Jellyfin server. Stored in ImportSource
 * (kind=JELLYFIN): baseUrl on the row, the access token + their Jellyfin user id
 * in the JSON config (never exposed to the client).
 */
export interface UserConnection {
  baseUrl: string;
  token: string;
  jellyfinUserId: string;
  serverName: string | null;
}

const trimUrl = (u: string) => u.trim().replace(/\/+$/, "");

interface StoredConfig {
  accessToken?: string;
  jellyfinUserId?: string;
  jellyfinUsername?: string;
  serverName?: string;
}

export async function getUserConnection(userId: string): Promise<UserConnection | null> {
  const src = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN", status: "CONNECTED" },
    select: { baseUrl: true, name: true, config: true },
  });
  if (!src?.baseUrl || !src.config) return null;
  try {
    const cfg = JSON.parse(src.config) as StoredConfig;
    if (!cfg.accessToken || !cfg.jellyfinUserId) return null;
    return { baseUrl: src.baseUrl, token: cfg.accessToken, jellyfinUserId: cfg.jellyfinUserId, serverName: cfg.serverName ?? src.name };
  } catch {
    return null;
  }
}

export interface ConnectionStatus {
  connected: boolean;
  baseUrl?: string;
  serverName?: string | null;
  username?: string | null;
}

export async function getConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const src = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN" },
    select: { baseUrl: true, name: true, status: true, config: true },
  });
  if (!src || src.status !== "CONNECTED") return { connected: false };
  let username: string | null = null;
  try {
    username = (JSON.parse(src.config ?? "{}") as StoredConfig).jellyfinUsername ?? null;
  } catch {
    /* ignore */
  }
  return { connected: true, baseUrl: src.baseUrl ?? undefined, serverName: src.name, username };
}

export type ConnectResult = { ok: true; serverName: string } | { ok: false; error: string };

/** Validate a Jellyfin URL + credentials and persist the connection. */
export async function connectJellyfin(
  userId: string,
  baseUrlRaw: string,
  username: string,
  password: string,
): Promise<ConnectResult> {
  const baseUrl = trimUrl(baseUrlRaw);
  const info = await getJellyfinServerInfo(baseUrl);
  if (!info) return { ok: false, error: "Serveur Jellyfin injoignable à cette URL." };

  const auth = await authenticateJellyfin(baseUrl, username, password);
  if (!auth) return { ok: false, error: "Identifiants Jellyfin incorrects." };

  const config = JSON.stringify({
    accessToken: auth.accessToken,
    jellyfinUserId: auth.jellyfinUserId,
    jellyfinUsername: auth.name,
    serverName: info.serverName,
  } satisfies StoredConfig);

  const existing = await db.importSource.findFirst({ where: { userId, kind: "JELLYFIN" }, select: { id: true } });
  if (existing) {
    await db.importSource.update({
      where: { id: existing.id },
      data: { baseUrl, name: info.serverName, status: "CONNECTED", config, lastSyncedAt: new Date() },
    });
  } else {
    await db.importSource.create({
      data: { userId, kind: "JELLYFIN", name: info.serverName, baseUrl, status: "CONNECTED", config },
    });
  }
  await db.user.update({ where: { id: userId }, data: { jellyfinUserId: auth.jellyfinUserId } });
  return { ok: true, serverName: info.serverName };
}

export async function disconnectJellyfin(userId: string): Promise<void> {
  await db.importSource.deleteMany({ where: { userId, kind: "JELLYFIN" } });
  await db.user.update({ where: { id: userId }, data: { jellyfinUserId: null } }).catch(() => {});
}
