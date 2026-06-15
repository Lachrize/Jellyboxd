import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { MediaRefInput } from "@/lib/validation/media";
import { getMediaProvider } from "./index";
import { parseEpisodeExternalId, parseSeasonExternalId, seasonExternalId } from "./refs";
import type { GenreDTO, MediaSummary, MovieDetail, SeriesDetail } from "./types";

const provider = () => getMediaProvider();

function buildSlug(title: string, year: number | null, kind: string, externalId: string) {
  return slugify([title, year ?? "", kind, externalId].filter(Boolean).join("-"));
}

async function genreConnect(genres?: GenreDTO[]) {
  if (!genres?.length) return undefined;
  const connect: { id: string }[] = [];
  for (const g of genres) {
    const slug = slugify(g.name);
    const genre = await db.genre.upsert({
      where: { slug },
      update: {},
      create: { name: g.name, slug, tmdbId: typeof g.id === "number" ? g.id : null },
    });
    connect.push({ id: genre.id });
  }
  return { connect };
}

async function findByMapping(providerName: string, externalId: string) {
  const mapping = await db.externalMapping.findUnique({
    where: { provider_externalId: { provider: providerName, externalId } },
    select: { mediaItemId: true },
  });
  return mapping?.mediaItemId ?? null;
}

async function ensureMovie(providerName: string, externalId: string): Promise<string | null> {
  const existing = await findByMapping(providerName, externalId);
  if (existing) return existing;

  const detail: MovieDetail | null = await provider().getMovie(externalId);
  if (!detail) return null;

  const item = await db.mediaItem.create({
    data: {
      kind: "MOVIE",
      slug: buildSlug(detail.title, detail.year, "movie", externalId),
      title: detail.title,
      sortTitle: detail.title,
      originalTitle: detail.originalTitle ?? null,
      overview: detail.overview ?? null,
      tagline: detail.tagline ?? null,
      releaseDate: detail.releaseDate ? new Date(detail.releaseDate) : null,
      year: detail.year,
      runtime: detail.runtime,
      posterUrl: detail.posterUrl,
      backdropUrl: detail.backdropUrl,
      voteAverage: detail.voteAverage,
      popularity: detail.popularity,
      originalLanguage: detail.originalLanguage ?? null,
      genres: await genreConnect(detail.genres),
      movie: { create: { director: detail.director ?? null, certification: detail.certification ?? null } },
      externalMappings: { create: { provider: providerName, externalId } },
    },
    select: { id: true },
  });
  return item.id;
}

/**
 * Materialise a movie spine from a lightweight search summary WITHOUT a per-item
 * detail fetch — built for bulk imports where speed matters. The summary already
 * carries everything cards/journal/profile need (title, year, poster, mapping);
 * the detail page fetches full data live from the provider on view, so nothing
 * is lost. Mapping-checked so re-runs and concurrent rows dedupe.
 */
export async function ensureMovieFromSummary(summary: MediaSummary): Promise<string | null> {
  const existing = await findByMapping(summary.provider, summary.externalId);
  if (existing) return existing;

  const item = await db.mediaItem.create({
    data: {
      kind: "MOVIE",
      slug: buildSlug(summary.title, summary.year, "movie", summary.externalId),
      title: summary.title,
      sortTitle: summary.title,
      originalTitle: summary.originalTitle ?? null,
      overview: summary.overview ?? null,
      year: summary.year,
      posterUrl: summary.posterUrl,
      backdropUrl: summary.backdropUrl,
      voteAverage: summary.voteAverage,
      popularity: summary.popularity,
      genres: await genreConnect(summary.genres),
      movie: { create: {} },
      externalMappings: { create: { provider: summary.provider, externalId: summary.externalId } },
    },
    select: { id: true },
  });
  return item.id;
}

async function ensureSeries(
  providerName: string,
  externalId: string,
): Promise<{ mediaItemId: string; seriesId: string } | null> {
  const existing = await db.externalMapping.findUnique({
    where: { provider_externalId: { provider: providerName, externalId } },
    select: { mediaItem: { select: { id: true, series: { select: { id: true } } } } },
  });
  if (existing?.mediaItem.series) {
    return { mediaItemId: existing.mediaItem.id, seriesId: existing.mediaItem.series.id };
  }

  const detail: SeriesDetail | null = await provider().getSeries(externalId);
  if (!detail) return null;

  const item = await db.mediaItem.create({
    data: {
      kind: "SERIES",
      slug: buildSlug(detail.title, detail.firstAirYear, "series", externalId),
      title: detail.title,
      sortTitle: detail.title,
      originalTitle: detail.originalTitle ?? null,
      overview: detail.overview ?? null,
      tagline: detail.tagline ?? null,
      releaseDate: detail.firstAirYear ? new Date(`${detail.firstAirYear}-01-01`) : null,
      year: detail.firstAirYear,
      runtime: detail.episodeRuntime,
      posterUrl: detail.posterUrl,
      backdropUrl: detail.backdropUrl,
      voteAverage: detail.voteAverage,
      popularity: detail.popularity,
      originalLanguage: detail.originalLanguage ?? null,
      status: detail.status,
      genres: await genreConnect(detail.genres),
      series: {
        create: {
          status: detail.status,
          firstAirDate: detail.firstAirYear ? new Date(`${detail.firstAirYear}-01-01`) : null,
          lastAirDate: detail.lastAirYear ? new Date(`${detail.lastAirYear}-12-31`) : null,
          network: detail.network ?? null,
          totalSeasons: detail.numberOfSeasons,
          totalEpisodes: detail.numberOfEpisodes,
        },
      },
      externalMappings: { create: { provider: providerName, externalId } },
    },
    select: { id: true, series: { select: { id: true } } },
  });
  return { mediaItemId: item.id, seriesId: item.series!.id };
}

async function ensureSeason(
  providerName: string,
  externalId: string,
): Promise<string | null> {
  const existing = await findByMapping(providerName, externalId);
  if (existing) return existing;

  const parsed = parseSeasonExternalId(externalId);
  if (!parsed) return null;

  const series = await ensureSeries(providerName, parsed.seriesExternalId);
  if (!series) return null;

  const detail = await provider().getSeason(parsed.seriesExternalId, parsed.seasonNumber);
  if (!detail) return null;

  const item = await db.mediaItem.create({
    data: {
      kind: "SEASON",
      slug: buildSlug(`${detail.seriesTitle} ${detail.name}`, null, "season", externalId),
      title: `${detail.seriesTitle} — ${detail.name}`,
      overview: detail.overview ?? null,
      releaseDate: detail.airDate ? new Date(detail.airDate) : null,
      year: detail.airDate ? new Date(detail.airDate).getFullYear() : null,
      posterUrl: detail.posterUrl,
      season: {
        create: {
          seriesId: series.seriesId,
          seasonNumber: detail.seasonNumber,
          episodeCount: detail.episodes.length,
          airDate: detail.airDate ? new Date(detail.airDate) : null,
        },
      },
      externalMappings: { create: { provider: providerName, externalId } },
    },
    select: { id: true },
  });
  return item.id;
}

async function ensureEpisode(providerName: string, externalId: string): Promise<string | null> {
  const existing = await findByMapping(providerName, externalId);
  if (existing) return existing;

  const parsed = parseEpisodeExternalId(externalId);
  if (!parsed) return null;

  const series = await ensureSeries(providerName, parsed.seriesExternalId);
  if (!series) return null;
  const seasonMediaItemId = await ensureSeason(
    providerName,
    seasonExternalId(parsed.seriesExternalId, parsed.seasonNumber),
  );
  if (!seasonMediaItemId) return null;

  const season = await db.season.findUnique({
    where: { mediaItemId: seasonMediaItemId },
    select: { id: true },
  });
  if (!season) return null;

  const ep = await provider().getEpisode(
    parsed.seriesExternalId,
    parsed.seasonNumber,
    parsed.episodeNumber,
  );
  if (!ep) return null;

  const item = await db.mediaItem.create({
    data: {
      kind: "EPISODE",
      slug: buildSlug(ep.name, null, "episode", externalId),
      title: ep.name,
      overview: ep.overview ?? null,
      releaseDate: ep.airDate ? new Date(ep.airDate) : null,
      runtime: ep.runtime,
      stillUrl: ep.stillUrl,
      voteAverage: ep.voteAverage,
      episode: {
        create: {
          seriesId: series.seriesId,
          seasonId: season.id,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          airDate: ep.airDate ? new Date(ep.airDate) : null,
        },
      },
      externalMappings: { create: { provider: providerName, externalId } },
    },
    select: { id: true },
  });
  return item.id;
}

/**
 * Resolves a media reference to a local MediaItem id, materialising it (and any
 * parents) from the active provider on first use. This is the seam every write
 * action goes through — and the same seam a Jellyfin importer would feed.
 */
export async function resolveMediaRef(ref: MediaRefInput): Promise<string | null> {
  if (ref.mediaItemId) {
    const found = await db.mediaItem.findUnique({
      where: { id: ref.mediaItemId },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  const providerName = ref.provider ?? getMediaProvider().name;
  const externalId = ref.externalId!;
  switch (ref.kind) {
    case "MOVIE":
      return ensureMovie(providerName, externalId);
    case "SERIES":
      return (await ensureSeries(providerName, externalId))?.mediaItemId ?? null;
    case "SEASON":
      return ensureSeason(providerName, externalId);
    case "EPISODE":
      return ensureEpisode(providerName, externalId);
    default:
      return null;
  }
}
