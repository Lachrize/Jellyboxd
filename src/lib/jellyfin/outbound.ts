import { db } from "@/lib/db";
import { getJellyfinConnection } from "./config";

export interface OutboundChanges {
  played?: boolean;
  favorite?: boolean;
  rating?: number | null; // null clears; undefined leaves untouched
}

/**
 * Push a Jellyboxd change to the user's Jellyfin server via the REST API.
 * Jellyboxd must reach Jellyfin on the local network (same model as Jellyseerr).
 */
export async function pushToJellyfin(userId: string, mediaItemId: string, changes: OutboundChanges): Promise<void> {
  try {
    const conn = await getJellyfinConnection(userId);
    if (!conn) return;

    const item = await db.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: {
        kind: true,
        externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } },
        episode: { select: { seasonNumber: true, episodeNumber: true, series: { select: { mediaItem: { select: { externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } } } } } } } },
        season: { select: { seasonNumber: true, series: { select: { mediaItem: { select: { externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } } } } } } } },
      },
    });
    if (!item || !["MOVIE", "SERIES", "SEASON", "EPISODE"].includes(item.kind)) return;

    const fullSync = item.kind === "MOVIE" || item.kind === "SERIES";
    const jellyfinItemId = await resolveJellyfinItemId(userId, mediaItemId, conn, item);
    if (!jellyfinItemId) return;

    const { client, jellyfinUserId } = conn;

    if (changes.played !== undefined) {
      await client.setPlayed(jellyfinUserId, jellyfinItemId, changes.played);
    }
    if (fullSync && changes.favorite !== undefined) {
      await client.setFavorite(jellyfinUserId, jellyfinItemId, changes.favorite);
    }
    if (fullSync && changes.rating !== undefined) {
      await client.setRating(jellyfinUserId, jellyfinItemId, changes.rating);
    }

    await db.syncLink.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      update: { jellyfinItemId },
      create: { userId, mediaItemId, jellyfinItemId },
    });
  } catch (error) {
    console.error("[jellyboxd] push to Jellyfin failed:", error);
  }
}

type MediaItemForResolve = {
  kind: string;
  externalMappings: { externalId: string }[];
  episode: {
    seasonNumber: number;
    episodeNumber: number;
    series: { mediaItem: { externalMappings: { externalId: string }[] } };
  } | null;
  season: {
    seasonNumber: number;
    series: { mediaItem: { externalMappings: { externalId: string }[] } };
  } | null;
};

async function resolveJellyfinItemId(
  userId: string,
  mediaItemId: string,
  conn: NonNullable<Awaited<ReturnType<typeof getJellyfinConnection>>>,
  item: MediaItemForResolve,
): Promise<string | null> {
  const link = await db.syncLink.findUnique({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    select: { jellyfinItemId: true },
  });
  if (link?.jellyfinItemId) return link.jellyfinItemId;

  const jellyfinMapping = await db.externalMapping.findUnique({
    where: { mediaItemId_provider: { mediaItemId, provider: "JELLYFIN" } },
    select: { externalId: true },
  });
  if (jellyfinMapping) return jellyfinMapping.externalId;

  const tmdbId = item.externalMappings[0]?.externalId;
  if (!tmdbId) return null;

  const jellyfinKind =
    item.kind === "MOVIE" ? "Movie" : item.kind === "SERIES" ? "Series" : item.kind === "SEASON" ? "Season" : "Episode";

  const seriesTmdb =
    item.episode?.series.mediaItem.externalMappings[0]?.externalId ??
    item.season?.series.mediaItem.externalMappings[0]?.externalId;

  const found = await conn.client.findItemByTmdb(conn.jellyfinUserId, tmdbId, jellyfinKind, {
    seriesTmdb,
    seasonNumber: item.episode?.seasonNumber ?? item.season?.seasonNumber,
    episodeNumber: item.episode?.episodeNumber,
  });

  return found?.Id ?? null;
}
