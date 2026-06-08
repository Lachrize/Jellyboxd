import { db } from "@/lib/db";
import { getMediaProvider } from "./index";
import { seedProvider } from "./seed";
import { tmdbProvider } from "./tmdb";
import type { MediaProvider } from "./provider";

/**
 * Provider-resilient detail resolution.
 *
 * A MediaItem may have been materialised under a different source than the one
 * currently active (e.g. items created with the offline seed before a TMDB key
 * was added). Links built from those external ids would 404 under the new
 * provider. These helpers try the active provider first, then fall back to the
 * provider recorded in the item's ExternalMapping — and report which provider
 * actually served the item so callers can build correct media refs.
 */

function providerByName(name: string): MediaProvider {
  switch (name) {
    case "TMDB":
      return tmdbProvider;
    case "SEED":
      return seedProvider;
    default:
      return getMediaProvider();
  }
}

async function mappedProvider(externalId: string): Promise<MediaProvider | null> {
  const mapping = await db.externalMapping.findFirst({
    where: { externalId },
    select: { provider: true },
  });
  return mapping ? providerByName(mapping.provider) : null;
}

async function resolve<T>(
  externalId: string,
  fetcher: (p: MediaProvider) => Promise<T | null>,
): Promise<{ detail: T; providerName: string } | null> {
  const active = getMediaProvider();
  const found = await fetcher(active);
  if (found) return { detail: found, providerName: active.name };

  const fallback = await mappedProvider(externalId);
  if (fallback && fallback.name !== active.name) {
    const detail = await fetcher(fallback);
    if (detail) return { detail, providerName: fallback.name };
  }
  return null;
}

export const resolveMovie = (externalId: string) =>
  resolve(externalId, (p) => p.getMovie(externalId));

export const resolveSeries = (externalId: string) =>
  resolve(externalId, (p) => p.getSeries(externalId));

export const resolveSeason = (seriesExternalId: string, seasonNumber: number) =>
  resolve(seriesExternalId, (p) => p.getSeason(seriesExternalId, seasonNumber));

export const resolveEpisode = (seriesExternalId: string, seasonNumber: number, episodeNumber: number) =>
  resolve(seriesExternalId, (p) => p.getEpisode(seriesExternalId, seasonNumber, episodeNumber));
