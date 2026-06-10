import { db } from "@/lib/db";
import { JellyfinClient, normalizeJellyfinUrl } from "./client";
import { decryptSecret, encryptSecret } from "./secrets";

export interface JellyfinSourceConfig {
  apiKeyEnc: string;
  jellyfinUserId: string;
  jellyfinUserName?: string;
  serverId: string;
}

export interface JellyfinConnection {
  sourceId: string;
  baseUrl: string;
  jellyfinUserId: string;
  jellyfinUserName?: string;
  serverId: string;
  client: JellyfinClient;
}

function parseConfig(raw: string | null): JellyfinSourceConfig | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as Partial<JellyfinSourceConfig>;
    if (!json.apiKeyEnc || !json.jellyfinUserId || !json.serverId) return null;
    return json as JellyfinSourceConfig;
  } catch {
    return null;
  }
}

export function buildConfig(input: {
  apiKey: string;
  jellyfinUserId: string;
  jellyfinUserName?: string;
  serverId: string;
}): string {
  return JSON.stringify({
    apiKeyEnc: encryptSecret(input.apiKey),
    jellyfinUserId: input.jellyfinUserId,
    jellyfinUserName: input.jellyfinUserName,
    serverId: input.serverId,
  } satisfies JellyfinSourceConfig);
}

export async function getJellyfinConnection(userId: string): Promise<JellyfinConnection | null> {
  const source = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN", status: { in: ["CONNECTED", "SYNCING"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, baseUrl: true, config: true },
  });
  if (!source?.baseUrl) return null;

  const config = parseConfig(source.config);
  if (!config) return null;

  let apiKey: string;
  try {
    apiKey = decryptSecret(config.apiKeyEnc);
  } catch {
    return null;
  }

  return {
    sourceId: source.id,
    baseUrl: source.baseUrl,
    jellyfinUserId: config.jellyfinUserId,
    jellyfinUserName: config.jellyfinUserName,
    serverId: config.serverId,
    client: new JellyfinClient(source.baseUrl, apiKey),
  };
}

export async function getJellyfinConnectionPreview(userId: string) {
  const source = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      status: true,
      lastSyncedAt: true,
      config: true,
    },
  });
  if (!source) return null;

  const config = parseConfig(source.config);
  return {
    id: source.id,
    name: source.name,
    baseUrl: source.baseUrl,
    status: source.status,
    lastSyncedAt: source.lastSyncedAt,
    jellyfinUserId: config?.jellyfinUserId ?? null,
    jellyfinUserName: config?.jellyfinUserName ?? null,
    serverId: config?.serverId ?? null,
    hasApiKey: Boolean(config?.apiKeyEnc),
  };
}

export async function getPrimaryJellyfinServer(): Promise<{
  sourceId: string;
  ownerId: string;
  baseUrl: string;
  apiKey: string;
  serverId: string;
  name: string;
} | null> {
  // Only an ADMIN-owned server may act as the instance-wide login authority.
  // Otherwise any regular user who connects their own (possibly malicious)
  // Jellyfin would become the server everyone authenticates against.
  const source = await db.importSource.findFirst({
    where: {
      kind: "JELLYFIN",
      status: { in: ["CONNECTED", "SYNCING"] },
      user: { isAdmin: true },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, userId: true, name: true, baseUrl: true, config: true },
  });
  if (!source?.baseUrl) return null;

  const config = parseConfig(source.config);
  if (!config) return null;

  try {
    return {
      sourceId: source.id,
      ownerId: source.userId,
      baseUrl: source.baseUrl,
      apiKey: decryptSecret(config.apiKeyEnc),
      serverId: config.serverId,
      name: source.name,
    };
  } catch {
    return null;
  }
}

export { normalizeJellyfinUrl };
