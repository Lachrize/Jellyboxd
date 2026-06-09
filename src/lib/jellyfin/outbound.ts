import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUserConnection, type UserConnection } from "./connection";
import {
  findJellyfinEpisodeId,
  findJellyfinItemIdByTmdb,
  findJellyfinSeasonId,
  setJellyfinFavorite,
  setJellyfinPlayed,
  setJellyfinRating,
} from "./client";

type MappingRow = { provider: string; externalId: string };
const tmdbOf = (mappings: MappingRow[]) => mappings.find((m) => m.provider === "TMDB")?.externalId ?? null;

interface LoadedItem {
  kind: string;
  externalMappings: MappingRow[];
  episode: { seasonNumber: number; episodeNumber: number; series: { mediaItem: { externalMappings: MappingRow[] } } } | null;
  season: { seasonNumber: number; series: { mediaItem: { externalMappings: MappingRow[] } } } | null;
}

/** Resolve the item id on the user's own server (cached per-user in SyncLink). */
async function resolveJellyfinItemId(
  conn: UserConnection,
  item: LoadedItem,
  cachedId: string | null,
): Promise<string | null> {
  if (cachedId) return cachedId;
  const jfUserId = conn.jellyfinUserId;

  if (item.kind === "MOVIE" || item.kind === "SERIES") {
    const tmdb = tmdbOf(item.externalMappings);
    return tmdb ? findJellyfinItemIdByTmdb(conn, jfUserId, tmdb, item.kind === "SERIES" ? "Series" : "Movie") : null;
  }
  if (item.kind === "EPISODE" && item.episode) {
    const seriesTmdb = tmdbOf(item.episode.series.mediaItem.externalMappings);
    if (!seriesTmdb) return null;
    const seriesId = await findJellyfinItemIdByTmdb(conn, jfUserId, seriesTmdb, "Series");
    if (!seriesId) return null;
    return findJellyfinEpisodeId(conn, jfUserId, seriesId, item.episode.seasonNumber, item.episode.episodeNumber);
  }
  if (item.kind === "SEASON" && item.season) {
    const seriesTmdb = tmdbOf(item.season.series.mediaItem.externalMappings);
    if (!seriesTmdb) return null;
    const seriesId = await findJellyfinItemIdByTmdb(conn, jfUserId, seriesTmdb, "Series");
    if (!seriesId) return null;
    return findJellyfinSeasonId(conn, jfUserId, seriesId, item.season.seasonNumber);
  }
  return null;
}

export interface OutboundChanges {
  played?: boolean;
  favorite?: boolean;
  rating?: number | null; // null clears; undefined leaves untouched
}

/**
 * Reflect a Jellyboxd change to the user's OWN Jellyfin server. Movies & whole
 * series sync watched/rating/favourite; seasons & episodes sync only "watched".
 * No-op when the user hasn't connected a server. Best-effort and fire-safe.
 */
export async function pushToJellyfin(userId: string, mediaItemId: string, changes: OutboundChanges): Promise<void> {
  try {
    const conn = await getUserConnection(userId);
    if (!conn) return;

    const item = (await db.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: {
        kind: true,
        externalMappings: { select: { provider: true, externalId: true } },
        episode: {
          select: {
            seasonNumber: true,
            episodeNumber: true,
            series: { select: { mediaItem: { select: { externalMappings: { select: { provider: true, externalId: true } } } } } },
          },
        },
        season: {
          select: {
            seasonNumber: true,
            series: { select: { mediaItem: { select: { externalMappings: { select: { provider: true, externalId: true } } } } } },
          },
        },
      },
    })) as LoadedItem | null;
    if (!item || !["MOVIE", "SERIES", "SEASON", "EPISODE"].includes(item.kind)) return;

    const fullSync = item.kind === "MOVIE" || item.kind === "SERIES";
    const eff: OutboundChanges = fullSync ? changes : { played: changes.played };
    if (eff.played === undefined && eff.favorite === undefined && eff.rating === undefined) return;

    const link = await db.syncLink.findUnique({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      select: { jellyfinItemId: true },
    });
    const jellyfinItemId = await resolveJellyfinItemId(conn, item, link?.jellyfinItemId ?? null);
    if (!jellyfinItemId) return; // not in this user's library

    const jfUserId = conn.jellyfinUserId;
    const now = new Date();
    const linkUpdate: Prisma.SyncLinkUncheckedUpdateInput = { jellyfinItemId };

    if (eff.played !== undefined && (await setJellyfinPlayed(conn, jfUserId, jellyfinItemId, eff.played))) {
      linkUpdate.played = eff.played;
      linkUpdate.playedAt = now;
    }
    if (eff.favorite !== undefined && (await setJellyfinFavorite(conn, jfUserId, jellyfinItemId, eff.favorite))) {
      linkUpdate.favorite = eff.favorite;
      linkUpdate.favoritedAt = now;
    }
    if (eff.rating !== undefined && (await setJellyfinRating(conn, jfUserId, jellyfinItemId, eff.rating))) {
      linkUpdate.rating = eff.rating;
      linkUpdate.ratedAt = now;
    }

    await db.syncLink.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      update: linkUpdate,
      create: {
        userId,
        mediaItemId,
        jellyfinItemId,
        played: eff.played ?? false,
        playedAt: eff.played !== undefined ? now : null,
        rating: eff.rating ?? null,
        ratedAt: eff.rating !== undefined ? now : null,
        favorite: eff.favorite ?? false,
        favoritedAt: eff.favorite !== undefined ? now : null,
      },
    });
  } catch (error) {
    console.error("[jellyboxd] outbound push to Jellyfin failed:", error);
  }
}
