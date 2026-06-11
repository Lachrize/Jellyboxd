import { db } from "@/lib/db";
import { resolveMediaRef } from "@/lib/media/upsert";
import { episodeExternalId, seasonExternalId } from "@/lib/media/refs";
import { slugify } from "@/lib/utils";
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
/**
 * Build a minimal MediaItem straight from the data the Jellyfin plugin already
 * sends (title, year, TMDB/IMDb ids) — no TMDB key required. This makes sync work
 * zero-config. When a TMDB key IS configured, the richer materialisation runs
 * first and this is skipped, so items still get posters/cast. Movies & whole
 * series only (where ratings/favourites live).
 */
async function materializeFromPayload(input: {
  kind: MediaKind;
  name: string;
  year: number | null;
  providerIds: JellyfinProviderIds;
  jellyfinItemId: string;
}): Promise<string | null> {
  const ids = input.providerIds;
  const mappings: { provider: string; externalId: string }[] = [];
  if (ids.Tmdb) mappings.push({ provider: "TMDB", externalId: String(ids.Tmdb) });
  if (ids.Imdb) mappings.push({ provider: "IMDB", externalId: String(ids.Imdb) });

  const anchor = ids.Tmdb
    ? `tmdb-${ids.Tmdb}`
    : ids.Imdb
      ? `imdb-${ids.Imdb}`
      : `jf-${input.jellyfinItemId}`;
  const slug = slugify([input.name, input.year ?? "", input.kind.toLowerCase(), anchor].filter(Boolean).join("-"));

  try {
    const item = await db.mediaItem.create({
      data: {
        kind: input.kind,
        slug,
        title: input.name,
        sortTitle: input.name,
        year: input.year,
        releaseDate: input.year ? new Date(Date.UTC(input.year, 0, 1)) : null,
        ...(input.kind === "MOVIE"
          ? { movie: { create: {} } }
          : { series: { create: { status: "UNKNOWN" } } }),
        ...(mappings.length ? { externalMappings: { create: mappings } } : {}),
      },
      select: { id: true },
    });
    return item.id;
  } catch {
    // Lost a race (a concurrent event created it) or a slug clash: return
    // whatever now exists for these ids rather than failing the sync.
    for (const m of mappings) {
      const found = await db.externalMapping.findUnique({
        where: { provider_externalId: { provider: m.provider, externalId: m.externalId } },
        select: { mediaItemId: true },
      });
      if (found) return found.mediaItemId;
    }
    return null;
  }
}

export async function resolveJellyfinItem(input: {
  jellyfinItemId: string;
  kind: MediaKind;
  name?: string | null; // title from Jellyfin — used by the no-TMDB fallback
  year?: number | null;
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
    // Zero-config fallback: no existing match and no TMDB enrichment (e.g. no
    // TMDB key) -> build the item from the Jellyfin payload so the sync still
    // lands. Needs a title; uses TMDB/IMDb ids for matching + outbound.
    if (!mediaItemId && input.name) {
      mediaItemId = await materializeFromPayload({
        kind,
        name: input.name,
        year: input.year ?? null,
        providerIds: ids,
        jellyfinItemId: input.jellyfinItemId,
      });
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
    // Cache the Jellyfin item id as a JELLYFIN mapping. ExternalMapping is unique
    // on BOTH (provider, externalId) and (mediaItemId, provider), so a plain
    // upsert keyed on one axis blows up when the other already holds a stale row
    // (e.g. the same movie previously cached under a different Jellyfin item id).
    // Only rewrite when it isn't already correct, clearing conflicts on either axis.
    const existing = await db.externalMapping.findUnique({
      where: { provider_externalId: { provider: "JELLYFIN", externalId: input.jellyfinItemId } },
      select: { mediaItemId: true },
    });
    if (existing?.mediaItemId !== mediaItemId) {
      await db.externalMapping.deleteMany({
        where: { provider: "JELLYFIN", OR: [{ externalId: input.jellyfinItemId }, { mediaItemId }] },
      });
      await db.externalMapping.create({
        data: { mediaItemId, provider: "JELLYFIN", externalId: input.jellyfinItemId },
      });
    }
  }

  return mediaItemId;
}
