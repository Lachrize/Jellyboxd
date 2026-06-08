import type { MediaKind, MediaProviderName, SeriesStatus } from "@/lib/constants";

/**
 * Provider-agnostic DTOs. Every media source (TMDB now, Jellyfin later) maps its
 * payloads onto these shapes, so the rest of the app never depends on a vendor.
 */

export interface GenreDTO {
  id: number | string;
  name: string;
}

export interface PersonDTO {
  id: string;
  name: string;
  character?: string | null;
  profileUrl?: string | null;
}

export interface PersonCredit extends MediaSummary {
  character?: string | null;
}

export interface PersonDetail {
  provider: MediaProviderName;
  id: string;
  name: string;
  biography?: string | null;
  profileUrl?: string | null;
  knownFor: PersonCredit[];
}

/** Lightweight card-level representation (search, grids, feeds). */
export interface MediaSummary {
  provider: MediaProviderName;
  externalId: string;
  kind: Extract<MediaKind, "MOVIE" | "SERIES">;
  title: string;
  originalTitle?: string | null;
  year: number | null;
  overview?: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number | null; // 0..10
  popularity?: number;
  genres?: GenreDTO[];
}

export interface MovieDetail extends MediaSummary {
  kind: "MOVIE";
  tagline?: string | null;
  runtime: number | null;
  releaseDate: string | null;
  director?: string | null;
  certification?: string | null;
  originalLanguage?: string | null;
  cast: PersonDTO[];
}

export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number | null;
  airDate: string | null;
  posterUrl: string | null;
  overview?: string | null;
}

export interface SeriesDetail extends MediaSummary {
  kind: "SERIES";
  tagline?: string | null;
  firstAirYear: number | null;
  lastAirYear: number | null;
  status: SeriesStatus;
  network?: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  episodeRuntime: number | null;
  originalLanguage?: string | null;
  seasons: SeasonSummary[];
  cast: PersonDTO[];
}

export interface EpisodeSummary {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string | null;
  airDate: string | null;
  runtime: number | null;
  stillUrl: string | null;
  voteAverage: number | null;
}

export interface SeasonDetail {
  provider: MediaProviderName;
  seriesExternalId: string;
  seriesTitle: string;
  seasonNumber: number;
  name: string;
  overview?: string | null;
  airDate: string | null;
  posterUrl: string | null;
  episodes: EpisodeSummary[];
}

export interface DiscoverFilters {
  kind?: "MOVIE" | "SERIES";
  genre?: string; // genre slug or name
  year?: number;
  sort?: "popularity" | "rating" | "recent";
  page?: number;
  pageSize?: number;
}

export interface DiscoverPage {
  results: MediaSummary[];
  totalPages: number;
  totalResults: number;
  page: number;
}
