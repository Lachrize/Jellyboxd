import type { MediaProviderName } from "@/lib/constants";
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

/**
 * The single contract every media source implements.
 * Adding Jellyfin later means writing one more class against this interface —
 * nothing else in the app changes.
 */
export interface MediaProvider {
  readonly name: MediaProviderName;

  search(query: string): Promise<MediaSummary[]>;
  trending(): Promise<MediaSummary[]>;
  discover(filters: DiscoverFilters): Promise<MediaSummary[]>;
  discoverPage(filters: DiscoverFilters): Promise<DiscoverPage>;
  genres(kind: "MOVIE" | "SERIES"): Promise<GenreDTO[]>;

  getMovie(externalId: string): Promise<MovieDetail | null>;
  getSeries(externalId: string): Promise<SeriesDetail | null>;
  getPerson(externalId: string): Promise<PersonDetail | null>;
  getSeason(seriesExternalId: string, seasonNumber: number): Promise<SeasonDetail | null>;
  getEpisode(
    seriesExternalId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<EpisodeSummary | null>;
}
