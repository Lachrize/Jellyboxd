import { db } from "@/lib/db";
import type { JellyfinItem } from "./client";
import { getJellyfinConnection } from "./config";
import { applyInboundEvent, type InboundSyncEvent } from "./inbound";

export interface SyncResult {
  ok: true;
  processed: number;
  applied: number;
  skipped: number;
  unmatched: number;
}

export interface SyncError {
  ok: false;
  error: string;
}

/**
 * Pull watch state from the user's Jellyfin server and apply it locally.
 * Jellyboxd must be on the same network as Jellyfin (like Jellyseerr/Jellystat).
 */
export async function syncFromJellyfin(userId: string): Promise<SyncResult | SyncError> {
  const conn = await getJellyfinConnection(userId);
  if (!conn) return { ok: false, error: "Aucune connexion Jellyfin configurée." };

  await db.importSource.update({
    where: { id: conn.sourceId },
    data: { status: "SYNCING" },
  });

  const seriesProviderCache = new Map<string, JellyfinItem["ProviderIds"]>();
  let startIndex = 0;
  const limit = 200;
  let total = Infinity;
  let processed = 0;
  let applied = 0;
  let skipped = 0;
  let unmatched = 0;

  try {
    while (startIndex < total) {
      const page = await conn.client.getUserItems(conn.jellyfinUserId, { startIndex, limit });
      total = page.TotalRecordCount;

      for (const item of page.Items) {
        processed += 1;
        if (item.Type === "Series" && item.ProviderIds) {
          seriesProviderCache.set(item.Id, item.ProviderIds);
        }

        const event = await itemToEvent(item, conn.jellyfinUserId, seriesProviderCache, conn.client);
        if (!event) {
          skipped += 1;
          continue;
        }

        const result = await applyInboundEvent(userId, event, { recordActivities: false });
        if (!result.ok) {
          if (result.reason === "item_unmatched") unmatched += 1;
          else skipped += 1;
          continue;
        }
        if (result.applied.length > 0) applied += 1;
      }

      startIndex += page.Items.length;
      if (page.Items.length === 0) break;
    }

    await db.importSource.update({
      where: { id: conn.sourceId },
      data: { status: "CONNECTED", lastSyncedAt: new Date() },
    });

    return { ok: true, processed, applied, skipped, unmatched };
  } catch (error) {
    await db.importSource.update({
      where: { id: conn.sourceId },
      data: { status: "ERROR" },
    });
    const message = error instanceof Error ? error.message : "Erreur de synchronisation.";
    return { ok: false, error: message };
  }
}

async function itemToEvent(
  item: JellyfinItem,
  jellyfinUserId: string,
  seriesCache: Map<string, JellyfinItem["ProviderIds"] | undefined>,
  client: import("./client").JellyfinClient,
): Promise<InboundSyncEvent | null> {
  const userData = item.UserData;
  if (!userData) return null;

  const hasState = userData.Played || userData.IsFavorite || (userData.Rating != null && userData.Rating > 0);
  if (!hasState) return null;

  let seriesProviderIds = item.SeriesId ? seriesCache.get(item.SeriesId) : undefined;
  if (item.SeriesId && !seriesProviderIds) {
    try {
      const series = await client.getItem(jellyfinUserId, item.SeriesId);
      seriesProviderIds = series.ProviderIds;
      seriesCache.set(item.SeriesId, seriesProviderIds);
    } catch {
      seriesProviderIds = undefined;
    }
  }

  return {
    user: { jellyfinUserId },
    item: {
      jellyfinItemId: item.Id,
      type: item.Type,
      name: item.Name,
      year: item.ProductionYear ?? null,
      providerIds: item.ProviderIds ?? null,
      seriesProviderIds: seriesProviderIds ?? null,
      seasonNumber: item.ParentIndexNumber ?? null,
      episodeNumber: item.IndexNumber ?? null,
    },
    state: {
      played: Boolean(userData.Played),
      isFavorite: Boolean(userData.IsFavorite),
      rating: userData.Rating ?? null,
    },
    timestamp: userData.LastPlayedDate ?? null,
  };
}
