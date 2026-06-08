/**
 * Centralised "enum" definitions.
 *
 * SQLite (via Prisma) has no native enums, so these string-union constants are
 * the single source of truth. They are reused by Zod schemas, the DB layer and
 * the UI. When migrating to PostgreSQL these map cleanly to real enums.
 */

export const MEDIA_KINDS = ["MOVIE", "SERIES", "SEASON", "EPISODE"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const SERIES_STATUSES = [
  "RETURNING",
  "ENDED",
  "CANCELED",
  "IN_PRODUCTION",
  "PLANNED",
  "UNKNOWN",
] as const;
export type SeriesStatus = (typeof SERIES_STATUSES)[number];

export const WATCH_PROGRESS_STATUSES = [
  "PLANNED",
  "WATCHING",
  "PAUSED",
  "COMPLETED",
  "DROPPED",
] as const;
export type WatchProgressStatus = (typeof WATCH_PROGRESS_STATUSES)[number];

export const WATCH_PROGRESS_LABELS: Record<WatchProgressStatus, string> = {
  PLANNED: "À voir",
  WATCHING: "En cours",
  PAUSED: "En pause",
  COMPLETED: "Terminée",
  DROPPED: "Abandonnée",
};

export const LIST_KINDS = ["CUSTOM", "WATCHLIST", "REWATCH", "COLLECTION"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

export const LIKE_TARGETS = ["REVIEW", "WATCH_ENTRY", "LIST", "COMMENT", "MEDIA"] as const;
export type LikeTarget = (typeof LIKE_TARGETS)[number];

export const VISIBILITIES = ["PUBLIC", "FRIENDS", "PRIVATE"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Public",
  FRIENDS: "Amis",
  PRIVATE: "Privé",
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  PUBLIC: "Visible par tout le monde",
  FRIENDS: "Visible par vos amis",
  PRIVATE: "Visible par vous seul",
};

export const FRIENDSHIP_STATUSES = ["PENDING", "ACCEPTED"] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "LOGGED",
  "RATED",
  "REVIEWED",
  "LIKED_REVIEW",
  "LIKED_MEDIA",
  "FOLLOWED",
  "LIST_CREATED",
  "WATCHLIST_ADDED",
  "SERIES_STATUS",
  "EPISODE_WATCHED",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const IMPORT_KINDS = ["JELLYFIN", "TRAKT", "TMDB", "CSV"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export const IMPORT_STATUSES = ["DISCONNECTED", "CONNECTED", "SYNCING", "ERROR"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const MEDIA_PROVIDERS = ["TMDB", "JELLYFIN", "IMDB", "TVDB", "SEED"] as const;
export type MediaProviderName = (typeof MEDIA_PROVIDERS)[number];

// --- Rating helpers (half-star granularity stored as int 1..10) ---
export const MAX_RATING = 10; // == 5.0 stars
export const ratingToStars = (value: number | null | undefined): number | null =>
  value == null ? null : value / 2;
export const starsToRating = (stars: number): number =>
  Math.max(1, Math.min(MAX_RATING, Math.round(stars * 2)));

// --- App ---
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Jellyboxd";
export const SESSION_DURATION_DAYS = 30;
export const PAGE_SIZE = 50;
