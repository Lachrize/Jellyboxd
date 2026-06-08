import { getMediaProvider } from "./index";
import { episodeHref, mediaHref, seasonHref } from "@/lib/links";

type Mapping = { provider: string; externalId: string };

/**
 * Picks the external id to use for links from a media item's mappings,
 * preferring the active provider (falls back to the first available).
 */
export function externalIdFor(mappings: Mapping[] | undefined | null): string | null {
  if (!mappings?.length) return null;
  const name = getMediaProvider().name;
  return mappings.find((m) => m.provider === name)?.externalId ?? mappings[0]!.externalId;
}

export interface LocalMediaLinkInput {
  kind: string;
  title: string;
  posterUrl: string | null;
  externalMappings: Mapping[];
  episode?: {
    seasonNumber: number;
    episodeNumber: number;
    series: { mediaItem: { title: string; posterUrl: string | null; externalMappings: Mapping[] } };
  } | null;
  season?: {
    seasonNumber: number;
    series: { mediaItem: { title: string; posterUrl: string | null; externalMappings: Mapping[] } };
  } | null;
}

export interface LocalMediaLink {
  href: string | null;
  title: string;
  subtitle: string | null;
  posterUrl: string | null;
  kind: string;
}

/** Resolves a deep link + display labels for any local media item (all kinds). */
export function localMediaLink(m: LocalMediaLinkInput): LocalMediaLink {
  if (m.kind === "MOVIE" || m.kind === "SERIES") {
    const ext = externalIdFor(m.externalMappings);
    return { href: ext ? mediaHref(m.kind, ext) : null, title: m.title, subtitle: null, posterUrl: m.posterUrl, kind: m.kind };
  }
  if (m.kind === "SEASON" && m.season) {
    const ext = externalIdFor(m.season.series.mediaItem.externalMappings);
    return {
      href: ext ? seasonHref(ext, m.season.seasonNumber) : null,
      title: m.season.series.mediaItem.title,
      subtitle: `Saison ${m.season.seasonNumber}`,
      posterUrl: m.posterUrl ?? m.season.series.mediaItem.posterUrl,
      kind: m.kind,
    };
  }
  if (m.kind === "EPISODE" && m.episode) {
    const ext = externalIdFor(m.episode.series.mediaItem.externalMappings);
    return {
      href: ext ? episodeHref(ext, m.episode.seasonNumber, m.episode.episodeNumber) : null,
      title: m.episode.series.mediaItem.title,
      subtitle: `S${m.episode.seasonNumber}E${m.episode.episodeNumber} · ${m.title}`,
      posterUrl: m.posterUrl ?? m.episode.series.mediaItem.posterUrl,
      kind: m.kind,
    };
  }
  return { href: null, title: m.title, subtitle: null, posterUrl: m.posterUrl, kind: m.kind };
}

/** Prisma include fragment to satisfy `localMediaLink`. */
export const localMediaInclude = {
  externalMappings: { select: { provider: true, externalId: true } },
  episode: {
    select: {
      seasonNumber: true,
      episodeNumber: true,
      series: { select: { mediaItem: { select: { title: true, posterUrl: true, externalMappings: { select: { provider: true, externalId: true } } } } } },
    },
  },
  season: {
    select: {
      seasonNumber: true,
      series: { select: { mediaItem: { select: { title: true, posterUrl: true, externalMappings: { select: { provider: true, externalId: true } } } } } },
    },
  },
} as const;
