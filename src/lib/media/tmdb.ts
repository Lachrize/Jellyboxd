import type { SeriesStatus } from "@/lib/constants";
import { tmdbImage } from "./images";
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

const BASE = "https://api.themoviedb.org/3";
const LANG = "fr-FR";
const TMDB_PAGE_SIZE = 20;
/** TMDB discover only serves API pages 1..500 (20 results each). */
const TMDB_MAX_API_PAGE = 500;

const STATUS_MAP: Record<string, SeriesStatus> = {
  "Returning Series": "RETURNING",
  Ended: "ENDED",
  Canceled: "CANCELED",
  "In Production": "IN_PRODUCTION",
  Planned: "PLANNED",
};

function authHeaders(key: string): HeadersInit {
  // A v4 read token is a JWT (contains dots); a v3 key is a short hash.
  return key.includes(".") ? { Authorization: `Bearer ${key}` } : {};
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("language", LANG);
  if (!key.includes(".")) url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  try {
    const res = await fetch(url, {
      headers: authHeaders(key),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const yearOf = (date?: string | null) =>
  date && date.length >= 4 ? Number(date.slice(0, 4)) : null;

// Genre id -> name cache (movie + tv combined).
let genreCache: Map<number, string> | null = null;
async function genreMap(): Promise<Map<number, string>> {
  if (genreCache) return genreCache;
  const map = new Map<number, string>();
  for (const kind of ["movie", "tv"]) {
    const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(`/genre/${kind}/list`);
    data?.genres.forEach((g) => map.set(g.id, g.name));
  }
  genreCache = map;
  return map;
}

interface TmdbResult {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
}

async function toSummary(r: TmdbResult, forceKind?: "MOVIE" | "SERIES"): Promise<MediaSummary> {
  const kind = forceKind ?? (r.media_type === "tv" ? "SERIES" : "MOVIE");
  const map = await genreMap();
  return {
    provider: "TMDB",
    externalId: String(r.id),
    kind,
    title: r.title ?? r.name ?? "Sans titre",
    originalTitle: r.original_title ?? r.original_name ?? null,
    year: yearOf(r.release_date ?? r.first_air_date),
    overview: r.overview ?? null,
    posterUrl: tmdbImage.poster(r.poster_path ?? null),
    backdropUrl: tmdbImage.backdrop(r.backdrop_path ?? null),
    voteAverage: r.vote_average ?? null,
    popularity: r.popularity,
    genres: (r.genre_ids ?? []).flatMap((id) => {
      const name = map.get(id);
      return name ? [{ id, name }] : [];
    }),
  };
}

class TmdbProvider implements MediaProvider {
  readonly name = "TMDB" as const;

  async search(query: string): Promise<MediaSummary[]> {
    const data = await tmdbFetch<{ results: TmdbResult[] }>("/search/multi", {
      query,
      include_adult: "false",
    });
    if (!data) return [];
    const results = data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    return Promise.all(results.map((r) => toSummary(r)));
  }

  async trending(): Promise<MediaSummary[]> {
    const data = await tmdbFetch<{ results: TmdbResult[] }>("/trending/all/week");
    if (!data) return [];
    const results = data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    return Promise.all(results.map((r) => toSummary(r)));
  }

  async discover(filters: DiscoverFilters): Promise<MediaSummary[]> {
    return (await this.discoverPage(filters)).results;
  }

  async discoverPage(filters: DiscoverFilters): Promise<DiscoverPage> {
    const isTv = filters.kind === "SERIES";
    const path = isTv ? "/discover/tv" : "/discover/movie";
    const sort =
      filters.sort === "rating"
        ? "vote_average.desc"
        : filters.sort === "recent"
          ? isTv
            ? "first_air_date.desc"
            : "primary_release_date.desc"
          : "popularity.desc";

    const requestedPage = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, filters.pageSize ?? TMDB_PAGE_SIZE);

    const params: Record<string, string | number> = {
      sort_by: sort,
      "vote_count.gte": filters.sort === "rating" ? 300 : 50,
    };
    if (filters.year) params[isTv ? "first_air_date_year" : "primary_release_year"] = filters.year;
    if (filters.genre) {
      const map = await genreMap();
      const id = [...map.entries()].find(
        ([, name]) => name.toLowerCase() === filters.genre!.toLowerCase(),
      )?.[0];
      if (id) params.with_genres = id;
    }

    type DiscoverResponse = { results: TmdbResult[]; total_results?: number; total_pages?: number };
    const meta = await tmdbFetch<DiscoverResponse>(path, { ...params, page: 1 });
    const apiTotalPages = Math.min(meta?.total_pages ?? 1, TMDB_MAX_API_PAGE);
    const totalResults = Math.min(meta?.total_results ?? 0, apiTotalPages * TMDB_PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const page = Math.min(requestedPage, totalPages);

    const start = (page - 1) * pageSize;
    const firstApiPage = Math.floor(start / TMDB_PAGE_SIZE) + 1;
    const offset = start % TMDB_PAGE_SIZE;
    const apiPagesNeeded = Math.ceil((offset + pageSize) / TMDB_PAGE_SIZE);

    if (start >= totalResults || firstApiPage > TMDB_MAX_API_PAGE) {
      return { results: [], totalPages, totalResults, page };
    }

    const pages = await Promise.all(
      Array.from({ length: apiPagesNeeded }, (_, i) => {
        const apiPage = firstApiPage + i;
        if (apiPage > TMDB_MAX_API_PAGE) return Promise.resolve(null);
        if (apiPage === 1 && meta) return Promise.resolve(meta);
        return tmdbFetch<DiscoverResponse>(path, { ...params, page: apiPage });
      }),
    );
    const results = pages.flatMap((data) => data?.results ?? []).slice(offset, offset + pageSize);

    return {
      results: await Promise.all(results.map((r) => toSummary(r, isTv ? "SERIES" : "MOVIE"))),
      totalPages,
      totalResults,
      page,
    };
  }

  async genres(kind: "MOVIE" | "SERIES"): Promise<GenreDTO[]> {
    const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
      `/genre/${kind === "SERIES" ? "tv" : "movie"}/list`,
    );
    return data?.genres ?? [];
  }

  async getMovie(externalId: string): Promise<MovieDetail | null> {
    const data = await tmdbFetch<
      TmdbResult & {
        tagline?: string;
        runtime?: number;
        original_language?: string;
        genres?: { id: number; name: string }[];
        credits?: { cast?: any[]; crew?: any[] };
      }
    >(`/movie/${externalId}`, { append_to_response: "credits" });
    if (!data) return null;

    const summary = await toSummary({ ...data, media_type: "movie" }, "MOVIE");
    return {
      ...summary,
      kind: "MOVIE",
      genres: data.genres?.map((g) => ({ id: g.id, name: g.name })) ?? summary.genres,
      tagline: data.tagline || null,
      runtime: data.runtime ?? null,
      releaseDate: data.release_date ?? null,
      originalLanguage: data.original_language ?? null,
      director: data.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
      certification: null,
      cast: (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
        id: String(c.id),
        name: c.name,
        character: c.character ?? null,
        profileUrl: tmdbImage.profile(c.profile_path ?? null),
      })),
    };
  }

  async getSeries(externalId: string): Promise<SeriesDetail | null> {
    const data = await tmdbFetch<
      TmdbResult & {
        tagline?: string;
        status?: string;
        last_air_date?: string;
        original_language?: string;
        number_of_seasons?: number;
        number_of_episodes?: number;
        episode_run_time?: number[];
        networks?: { name: string }[];
        genres?: { id: number; name: string }[];
        seasons?: any[];
        credits?: { cast?: any[] };
      }
    >(`/tv/${externalId}`, { append_to_response: "credits" });
    if (!data) return null;

    const summary = await toSummary({ ...data, media_type: "tv" }, "SERIES");
    return {
      ...summary,
      kind: "SERIES",
      genres: data.genres?.map((g) => ({ id: g.id, name: g.name })) ?? summary.genres,
      tagline: data.tagline || null,
      firstAirYear: yearOf(data.first_air_date),
      lastAirYear: yearOf(data.last_air_date),
      status: STATUS_MAP[data.status ?? ""] ?? "UNKNOWN",
      network: data.networks?.[0]?.name ?? null,
      numberOfSeasons: data.number_of_seasons ?? null,
      numberOfEpisodes: data.number_of_episodes ?? null,
      episodeRuntime: data.episode_run_time?.[0] ?? null,
      originalLanguage: data.original_language ?? null,
      cast: (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
        id: String(c.id),
        name: c.name,
        character: c.character ?? null,
        profileUrl: tmdbImage.profile(c.profile_path ?? null),
      })),
      seasons: (data.seasons ?? [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          seasonNumber: s.season_number,
          name: s.name,
          episodeCount: s.episode_count ?? null,
          airDate: s.air_date ?? null,
          posterUrl: tmdbImage.poster(s.poster_path ?? null),
          overview: s.overview ?? null,
        })),
    };
  }

  async getPerson(externalId: string): Promise<PersonDetail | null> {
    const data = await tmdbFetch<{
      id: number;
      name: string;
      biography?: string;
      profile_path?: string | null;
      combined_credits?: { cast?: (TmdbResult & { character?: string | null })[] };
    }>(`/person/${externalId}`, { append_to_response: "combined_credits" });
    if (!data) return null;

    const seen = new Set<string>();
    const cast = (data.combined_credits?.cast ?? [])
      .filter((credit) => credit.media_type === "movie" || credit.media_type === "tv")
      .filter((credit) => {
        const key = `${credit.media_type}-${credit.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 60);

    const knownFor = await Promise.all(
      cast.map(async (credit) => ({
        ...(await toSummary(credit)),
        character: credit.character ?? null,
      })),
    );

    return {
      provider: "TMDB",
      id: String(data.id),
      name: data.name,
      biography: data.biography || null,
      profileUrl: tmdbImage.profile(data.profile_path ?? null),
      knownFor,
    };
  }

  async getSeason(seriesExternalId: string, seasonNumber: number): Promise<SeasonDetail | null> {
    const [series, data] = await Promise.all([
      this.getSeries(seriesExternalId),
      tmdbFetch<{ name: string; overview?: string; air_date?: string; poster_path?: string; episodes?: any[] }>(
        `/tv/${seriesExternalId}/season/${seasonNumber}`,
      ),
    ]);
    if (!data) return null;
    return {
      provider: "TMDB",
      seriesExternalId,
      seriesTitle: series?.title ?? "",
      seasonNumber,
      name: data.name,
      overview: data.overview ?? null,
      airDate: data.air_date ?? null,
      posterUrl: tmdbImage.poster(data.poster_path ?? null),
      episodes: (data.episodes ?? []).map((e) => ({
        seasonNumber,
        episodeNumber: e.episode_number,
        name: e.name,
        overview: e.overview ?? null,
        airDate: e.air_date ?? null,
        runtime: e.runtime ?? null,
        stillUrl: tmdbImage.still(e.still_path ?? null),
        voteAverage: e.vote_average ?? null,
      })),
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

export const tmdbProvider = new TmdbProvider();
