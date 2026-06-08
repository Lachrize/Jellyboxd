import { slugify } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import type { MediaProvider } from "./provider";
import type {
  DiscoverPage,
  DiscoverFilters,
  EpisodeSummary,
  GenreDTO,
  MediaSummary,
  MovieDetail,
  PersonDetail,
  SeasonDetail,
  SeriesDetail,
} from "./types";
import {
  SEED_GENRES,
  SEED_MOVIES,
  SEED_SERIES,
  type SeedMovie,
  type SeedSeries,
} from "./seed-catalog";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function toCast(names: string[]) {
  return names.map((name) => ({ id: slugify(name), name }));
}

function movieSummary(m: SeedMovie): MediaSummary {
  return {
    provider: "SEED",
    externalId: m.externalId,
    kind: "MOVIE",
    title: m.title,
    year: m.year,
    overview: m.overview,
    posterUrl: null,
    backdropUrl: null,
    voteAverage: m.voteAverage,
    popularity: m.popularity,
    genres: m.genres.map((g) => ({ id: slugify(g), name: g })),
  };
}

function movieDetail(m: SeedMovie): MovieDetail {
  return {
    ...movieSummary(m),
    kind: "MOVIE",
    tagline: m.tagline ?? null,
    runtime: m.runtime,
    releaseDate: m.releaseDate,
    director: m.director,
    certification: null,
    originalLanguage: m.originalLanguage,
    cast: toCast(m.cast),
  };
}

function seriesSummary(s: SeedSeries): MediaSummary {
  return {
    provider: "SEED",
    externalId: s.externalId,
    kind: "SERIES",
    title: s.title,
    year: s.firstAirYear,
    overview: s.overview,
    posterUrl: null,
    backdropUrl: null,
    voteAverage: s.voteAverage,
    popularity: s.popularity,
    genres: s.genres.map((g) => ({ id: slugify(g), name: g })),
  };
}

function seriesDetail(s: SeedSeries): SeriesDetail {
  return {
    ...seriesSummary(s),
    kind: "SERIES",
    tagline: s.tagline ?? null,
    firstAirYear: s.firstAirYear,
    lastAirYear: s.lastAirYear,
    status: s.status,
    network: s.network,
    numberOfSeasons: s.numberOfSeasons,
    numberOfEpisodes: s.numberOfEpisodes,
    episodeRuntime: s.episodeRuntime,
    originalLanguage: s.originalLanguage,
    cast: toCast(s.cast),
    seasons: s.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      name: season.name,
      episodeCount: season.episodeCount,
      airDate: season.airDate,
      posterUrl: null,
      overview: season.overview,
    })),
  };
}

function matchesFilters(summary: MediaSummary, f: DiscoverFilters): boolean {
  if (f.kind && summary.kind !== f.kind) return false;
  if (f.genre) {
    const target = slugify(f.genre);
    if (!summary.genres?.some((g) => slugify(g.name) === target)) return false;
  }
  if (f.year && summary.year !== f.year) return false;
  return true;
}

function sortSummaries(items: MediaSummary[], sort: DiscoverFilters["sort"]) {
  const copy = [...items];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
    case "recent":
      return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case "popularity":
    default:
      return copy.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }
}

class SeedProvider implements MediaProvider {
  readonly name = "SEED" as const;

  private allSummaries(): MediaSummary[] {
    return [...SEED_MOVIES.map(movieSummary), ...SEED_SERIES.map(seriesSummary)];
  }

  async search(query: string): Promise<MediaSummary[]> {
    const q = normalize(query.trim());
    if (!q) return [];
    return sortSummaries(
      this.allSummaries().filter((s) => normalize(s.title).includes(q)),
      "popularity",
    );
  }

  async trending(): Promise<MediaSummary[]> {
    return sortSummaries(this.allSummaries(), "popularity").slice(0, 18);
  }

  async discover(filters: DiscoverFilters): Promise<MediaSummary[]> {
    return (await this.discoverPage(filters)).results;
  }

  async discoverPage(filters: DiscoverFilters): Promise<DiscoverPage> {
    const pageSize = filters.pageSize ?? PAGE_SIZE;
    const filtered = this.allSummaries().filter((s) => matchesFilters(s, filters));
    const sorted = sortSummaries(filtered, filters.sort ?? "popularity");
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(Math.max(1, filters.page ?? 1), totalPages);
    return {
      results: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalPages,
      totalResults: filtered.length,
      page,
    };
  }

  async genres(): Promise<GenreDTO[]> {
    return SEED_GENRES.map((g) => ({ id: slugify(g), name: g }));
  }

  async getMovie(externalId: string): Promise<MovieDetail | null> {
    const m = SEED_MOVIES.find((x) => x.externalId === externalId);
    return m ? movieDetail(m) : null;
  }

  async getSeries(externalId: string): Promise<SeriesDetail | null> {
    const s = SEED_SERIES.find((x) => x.externalId === externalId);
    return s ? seriesDetail(s) : null;
  }

  async getPerson(externalId: string): Promise<PersonDetail | null> {
    const movies = SEED_MOVIES.filter((m) => m.cast.some((name) => slugify(name) === externalId));
    const series = SEED_SERIES.filter((s) => s.cast.some((name) => slugify(name) === externalId));
    const name = [...movies.flatMap((m) => m.cast), ...series.flatMap((s) => s.cast)].find(
      (castName) => slugify(castName) === externalId,
    );
    if (!name) return null;

    return {
      provider: "SEED",
      id: externalId,
      name,
      biography: null,
      profileUrl: null,
      knownFor: [
        ...movies.map((movie) => ({ ...movieSummary(movie), character: null })),
        ...series.map((show) => ({ ...seriesSummary(show), character: null })),
      ],
    };
  }

  async getSeason(seriesExternalId: string, seasonNumber: number): Promise<SeasonDetail | null> {
    const s = SEED_SERIES.find((x) => x.externalId === seriesExternalId);
    const season = s?.seasons.find((x) => x.seasonNumber === seasonNumber);
    if (!s || !season) return null;
    const episodes: EpisodeSummary[] = Array.from({ length: season.episodeCount }, (_, i) => ({
      seasonNumber,
      episodeNumber: i + 1,
      name: `Épisode ${i + 1}`,
      overview: null,
      airDate: season.airDate,
      runtime: s.episodeRuntime,
      stillUrl: null,
      voteAverage: s.voteAverage,
    }));
    return {
      provider: "SEED",
      seriesExternalId,
      seriesTitle: s.title,
      seasonNumber,
      name: season.name,
      overview: season.overview ?? null,
      airDate: season.airDate,
      posterUrl: null,
      episodes,
    };
  }

  async getEpisode(
    seriesExternalId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<EpisodeSummary | null> {
    const season = await this.getSeason(seriesExternalId, seasonNumber);
    return season?.episodes.find((e) => e.episodeNumber === episodeNumber) ?? null;
  }
}

export const seedProvider = new SeedProvider();
