const TMDB_IMG = "https://image.tmdb.org/t/p";

export const tmdbImage = {
  poster: (path: string | null, size: "w342" | "w500" | "original" = "w500") =>
    path ? `${TMDB_IMG}/${size}${path}` : null,
  backdrop: (path: string | null, size: "w780" | "w1280" | "original" = "w1280") =>
    path ? `${TMDB_IMG}/${size}${path}` : null,
  still: (path: string | null, size: "w300" | "w780" = "w300") =>
    path ? `${TMDB_IMG}/${size}${path}` : null,
  profile: (path: string | null, size: "w185" | "w342" = "w185") =>
    path ? `${TMDB_IMG}/${size}${path}` : null,
};
