import { db } from "@/lib/db";
import { resolveMediaRef } from "@/lib/media/upsert";
import { episodeExternalId, seasonExternalId } from "@/lib/media/refs";
import type { MediaKind } from "@/lib/constants";

/** Jellyfin's `ProviderIds` bag (only the ones we care about). */
export interface JellyfinProviderIds {
  Tmdb?: string;
  Imdb?: string;
  Tvdb?: string;
}

/**
 * External-id sources we can match on, in priority order. Jellyfin's provider
 * key -> Jellyboxd's `ExternalMapping.provider` value.
 */
const PROVIDER_PRIORITY = [
  { jellyfin: "Tmdb", jellyboxd: "TMDB" },
  { jellyfin: "Imdb", jellyboxd: "IMDB" },
  { jellyfin: "Tvdb", jellyboxd: "TVDB" },
] as const;

/**
 * Resolves a Jellyfin item to a local MediaItem id.
 *
 * - Movies & series: match an existing `ExternalMapping` by TMDB/IMDb/TVDB, else
 *   materialise from TMDB.
 * - Seasons & episodes: Jellyfin episodes rarely carry a TMDB id, so we match by
 *   the *series* TMDB id + season/episode numbers, building the composite ref the
 *   local pipeline uses (`<seriesTmdb>::sN[eM]`) and materialising via TMDB.
 *
 * Caches the Jellyfin item id as a `JELLYFIN` mapping for O(1) reverse lookups.
 * Returns null when nothing can be matched/materialised — the caller then skips.
 */
export async function resolveJellyfinItem(input: {
  jellyfinItemId: string;
  kind: MediaKind;
  providerIds?: JellyfinProviderIds | null; // item's own ids (movie/series)
  seriesProviderIds?: JellyfinProviderIds | null; // parent series ids (season/episode)
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}): Promise<string | null> {
  const { kind } = input;
  let mediaItemId: string | null = null;

  if (kind === "MOVIE" || kind === "SERIES") {
    const ids = input.providerIds ?? {};
    for (const { jellyfin, jellyboxd } of PROVIDER_PRIORITY) {
      const externalId = ids[jellyfin];
      if (!externalId) continue;
      const mapping = await db.externalMapping.findUnique({
        where: { provider_externalId: { provider: jellyboxd, externalId: String(externalId) } },
        select: { mediaItemId: true },
      });
      if (mapping) {
        mediaItemId = mapping.mediaItemId;
        break;
      }
    }
    if (!mediaItemId && ids.Tmdb) {
      mediaItemId = await resolveMediaRef({ provider: "TMDB", externalId: String(ids.Tmdb), kind });
    }
  } else   if (kind === "SEASON" || kind === "EPISODE") {
    const seriesTmdb = input.seriesProviderIds?.Tmdb;
    const season = input.seasonNumber;
    if (!seriesTmdb || season == null) return null;
    const externalId =
      kind === "SEASON"
        ? seasonExternalId(String(seriesTmdb), season)
        : input.episodeNumber == null
          ? null
          : episodeExternalId(String(seriesTmdb), season, input.episodeNumber);
    if (!externalId) return null;
    mediaItemId = await resolveMediaRef({ provider: "TMDB", externalId, kind });
  }

  if (mediaItemId) {
    await db.externalMapping.upsert({
      where: { provider_externalId: { provider: "JELLYFIN", externalId: input.jellyfinItemId } },
      update: { mediaItemId },
      create: { mediaItemId, provider: "JELLYFIN", externalId: input.jellyfinItemId },
    });
  }

  return mediaItemId;
}
