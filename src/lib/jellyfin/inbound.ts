import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/services/activity";
import { ensureSeenMedia } from "@/lib/services/seen";
import type { MediaKind } from "@/lib/constants";
import { resolveJellyfinItem, type JellyfinProviderIds } from "./match";

/**
 * One Jellyfin user-data snapshot. `state` is the *full* current value for the
 * item (not a diff), which makes the inbound apply idempotent and order-independent.
 */
export interface InboundSyncEvent {
  user: { name?: string | null; jellyfinUserId?: string | null };
  item: {
    jellyfinItemId: string;
    type: string; // Movie | Series | Season | Episode
    name?: string | null;
    year?: number | null;
    providerIds?: JellyfinProviderIds | null;
    seriesProviderIds?: JellyfinProviderIds | null; // for Season/Episode matching
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  };
  state: {
    played: boolean;
    isFavorite: boolean;
    rating: number | null; // Jellyfin user rating 0..10 (double) or null
  };
  timestamp?: string | null; // ISO 8601; defaults to now
}

export type InboundResult =
  | { ok: true; applied: string[]; mediaItemId: string }
  | { ok: false; reason: "item_unsupported" | "item_unmatched" };

/** Map a Jellyfin item type to a Jellyboxd MediaKind. */
function mapKind(type: string): MediaKind | null {
  const t = type.trim().toUpperCase();
  return t === "MOVIE" || t === "SERIES" || t === "SEASON" || t === "EPISODE" ? (t as MediaKind) : null;
}

/** Jellyfin rating (double 0..10, or <=0/undefined = unset) -> Jellyboxd int 1..10 | null. */
function mapRating(rating: number | null | undefined): number | null {
  if (rating == null || rating <= 0) return null;
  return Math.max(1, Math.min(10, Math.round(rating)));
}

function parseTimestamp(value: string | null | undefined): Date {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Per-field decision combining the two safeguards:
 *  - "noop": incoming already equals the local value -> kills the echo loop.
 *  - "apply": value differs and the incoming change is at least as recent as the
 *    last value we agreed on (last-write-wins).
 *  - "skip": value differs but a more recent local change exists -> local wins.
 */
function decide<T>(incoming: T, current: T, incomingAt: Date, lastAt: Date | null): "noop" | "apply" | "skip" {
  if (incoming === current) return "noop";
  if (!lastAt || incomingAt.getTime() >= lastAt.getTime()) return "apply";
  return "skip";
}

/**
 * Applies a Jellyfin user-data change to Jellyboxd. Shared by the realtime
 * the Jellyfin pull sync and realtime pushes. Writes the underlying state
 * (SeenMedia / Rating / Like) and updates the SyncLink snapshot used for echo
 * suppression and last-write-wins.
 *
 * `recordActivities` is true for realtime (so the feed reflects Jellyfin
 * activity) and false for backfill (to avoid flooding the feed with history).
 */
export async function applyInboundEvent(
  userId: string,
  event: InboundSyncEvent,
  options: { recordActivities?: boolean } = {},
): Promise<InboundResult> {
  const recordActivities = options.recordActivities ?? true;

  const kind = mapKind(event.item.type);
  if (!kind) return { ok: false, reason: "item_unsupported" };

  // Whole movies and series sync watched + rating + favourite; seasons and
  // episodes only sync "watched" (no per-season/episode rating or favourite).
  const fullSync = kind === "MOVIE" || kind === "SERIES";

  const mediaItemId = await resolveJellyfinItem({
    jellyfinItemId: event.item.jellyfinItemId,
    kind,
    name: event.item.name,
    year: event.item.year,
    providerIds: event.item.providerIds,
    seriesProviderIds: event.item.seriesProviderIds,
    seasonNumber: event.item.seasonNumber,
    episodeNumber: event.item.episodeNumber,
  });
  if (!mediaItemId) return { ok: false, reason: "item_unmatched" };

  const at = parseTimestamp(event.timestamp);
  const link = await db.syncLink.findUnique({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    select: { played: true, playedAt: true, rating: true, ratedAt: true, favorite: true, favoritedAt: true },
  });

  const [seen, ratingRow, likeRow] = await Promise.all([
    db.seenMedia.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId } }, select: { id: true } }),
    db.rating.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId } }, select: { value: true } }),
    db.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "MEDIA", targetId: mediaItemId } },
      select: { id: true },
    }),
  ]);

  const applied: string[] = [];
  const linkData: Prisma.SyncLinkUncheckedUpdateInput = {};

  // --- Played / Seen ---
  const incomingPlayed = Boolean(event.state.played);
  const currentSeen = Boolean(seen);
  const playedDecision = decide(incomingPlayed, currentSeen, at, link?.playedAt ?? null);
  if (playedDecision === "apply") {
    if (incomingPlayed) {
      await ensureSeenMedia(userId, mediaItemId);
      if (recordActivities) {
        await db.activity.deleteMany({ where: { actorId: userId, mediaItemId, type: "LOGGED" } });
        await recordActivity({ actorId: userId, type: "LOGGED", mediaItemId });
      }
    } else {
      await db.seenMedia.deleteMany({ where: { userId, mediaItemId } });
    }
    applied.push("played");
    linkData.played = incomingPlayed;
    linkData.playedAt = at;
  } else if (playedDecision === "noop") {
    linkData.played = incomingPlayed;
    linkData.playedAt = newerOf(link?.playedAt ?? null, at);
  }

  // --- Rating (movies & whole series only) ---
  const incomingRating = fullSync ? mapRating(event.state.rating) : null;
  const currentRating = ratingRow?.value ?? null;
  const ratingDecision = fullSync ? decide(incomingRating, currentRating, at, link?.ratedAt ?? null) : "noop";
  if (fullSync && ratingDecision === "apply") {
    if (incomingRating == null) {
      await db.rating.deleteMany({ where: { userId, mediaItemId } });
      if (recordActivities) {
        await db.activity.deleteMany({ where: { actorId: userId, mediaItemId, type: "RATED" } });
      }
    } else {
      await db.rating.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId } },
        update: { value: incomingRating },
        create: { userId, mediaItemId, value: incomingRating },
      });
      await ensureSeenMedia(userId, mediaItemId);
      if (recordActivities) {
        await db.activity.deleteMany({ where: { actorId: userId, mediaItemId, type: "RATED" } });
        await recordActivity({ actorId: userId, type: "RATED", mediaItemId, data: { rating: incomingRating } });
      }
    }
    applied.push("rating");
    linkData.rating = incomingRating;
    linkData.ratedAt = at;
  } else if (fullSync && ratingDecision === "noop") {
    linkData.rating = incomingRating;
    linkData.ratedAt = newerOf(link?.ratedAt ?? null, at);
  }

  // --- Favorite (movies & whole series only) ---
  const incomingFavorite = fullSync ? Boolean(event.state.isFavorite) : false;
  const currentFavorite = Boolean(likeRow);
  const favoriteDecision = fullSync ? decide(incomingFavorite, currentFavorite, at, link?.favoritedAt ?? null) : "noop";
  if (fullSync && favoriteDecision === "apply") {
    if (incomingFavorite) {
      await db.like.upsert({
        where: { userId_targetType_targetId: { userId, targetType: "MEDIA", targetId: mediaItemId } },
        update: {},
        create: { userId, targetType: "MEDIA", targetId: mediaItemId },
      });
      if (recordActivities) {
        await db.activity.deleteMany({
          where: { actorId: userId, type: "LIKED_MEDIA", targetType: "MEDIA", targetId: mediaItemId },
        });
        await recordActivity({
          actorId: userId,
          type: "LIKED_MEDIA",
          mediaItemId,
          targetType: "MEDIA",
          targetId: mediaItemId,
        });
      }
    } else {
      await db.like.deleteMany({ where: { userId, targetType: "MEDIA", targetId: mediaItemId } });
      if (recordActivities) {
        await db.activity.deleteMany({
          where: { actorId: userId, type: "LIKED_MEDIA", targetType: "MEDIA", targetId: mediaItemId },
        });
      }
    }
    applied.push("favorite");
    linkData.favorite = incomingFavorite;
    linkData.favoritedAt = at;
  } else if (fullSync && favoriteDecision === "noop") {
    linkData.favorite = incomingFavorite;
    linkData.favoritedAt = newerOf(link?.favoritedAt ?? null, at);
  }

  await db.syncLink.upsert({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    update: { ...linkData, jellyfinItemId: event.item.jellyfinItemId },
    create: {
      userId,
      mediaItemId,
      jellyfinItemId: event.item.jellyfinItemId,
      played: incomingPlayed,
      playedAt: playedDecision === "skip" ? (link?.playedAt ?? null) : at,
      rating: incomingRating,
      ratedAt: ratingDecision === "skip" ? (link?.ratedAt ?? null) : at,
      favorite: incomingFavorite,
      favoritedAt: favoriteDecision === "skip" ? (link?.favoritedAt ?? null) : at,
    },
  });

  return { ok: true, applied, mediaItemId };
}

function newerOf(a: Date | null, b: Date): Date {
  if (!a) return b;
  return a.getTime() >= b.getTime() ? a : b;
}
