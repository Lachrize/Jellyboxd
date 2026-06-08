import { db } from "@/lib/db";
import { localMediaInclude, localMediaLink, type LocalMediaLink, type LocalMediaLinkInput } from "@/lib/media/local";
import { visibleVisibilitiesFor } from "@/lib/services/friends";

export interface SeenItem {
  mediaItemId: string;
  link: LocalMediaLink;
  rating: number | null;
  date: Date;
}

export interface LibraryItem {
  mediaItemId: string;
  link: LocalMediaLink;
  rating: number | null;
  date: Date;
  hasReview: boolean;
  liked: boolean;
  logged: boolean;
}

/**
 * A user's recently "seen" media — the union of diary entries AND standalone
 * ratings (rating-only items count as seen, like on Letterboxd), deduped by
 * media and sorted by most recent interaction.
 */
export async function getRecentSeen(
  userId: string,
  viewerId: string | null,
  take = 12,
): Promise<SeenItem[]> {
  const allowed = await visibleVisibilitiesFor(userId, viewerId);
  const visWhere = allowed ? { visibility: { in: allowed } } : {};
  const [entries, ratings] = await Promise.all([
    db.watchEntry.findMany({
      where: { userId, ...visWhere, mediaItem: { kind: { in: ["MOVIE", "SERIES"] } } },
      orderBy: { watchedOn: "desc" },
      take: 40,
      include: { mediaItem: { include: localMediaInclude } },
    }),
    db.rating.findMany({
      where: { userId, ...visWhere, mediaItem: { kind: { in: ["MOVIE", "SERIES"] } } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { mediaItem: { include: localMediaInclude } },
    }),
  ]);

  const map = new Map<string, { date: Date; mediaItem: (typeof entries)[number]["mediaItem"]; rating: number | null }>();

  for (const r of ratings) {
    map.set(r.mediaItemId, { date: r.createdAt, mediaItem: r.mediaItem, rating: r.value });
  }
  for (const e of entries) {
    const existing = map.get(e.mediaItemId);
    if (existing) {
      if (e.watchedOn > existing.date) existing.date = e.watchedOn;
      if (existing.rating == null) existing.rating = e.rating;
    } else {
      map.set(e.mediaItemId, { date: e.watchedOn, mediaItem: e.mediaItem, rating: e.rating });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, take)
    .map((it) => ({
      mediaItemId: it.mediaItem.id,
      link: localMediaLink(it.mediaItem),
      rating: it.rating,
      date: it.date,
    }));
}

function upsertLibraryItem(
  map: Map<string, { mediaItem: LocalMediaLinkInput & { id: string }; date: Date; rating: number | null; hasReview: boolean; liked: boolean; logged: boolean }>,
  mediaItem: LocalMediaLinkInput & { id: string },
  date: Date,
  data: Partial<Pick<LibraryItem, "rating" | "hasReview" | "liked" | "logged">>,
) {
  const existing = map.get(mediaItem.id);
  if (!existing) {
    map.set(mediaItem.id, {
      mediaItem,
      date,
      rating: data.rating ?? null,
      hasReview: data.hasReview ?? false,
      liked: data.liked ?? false,
      logged: data.logged ?? false,
    });
    return;
  }

  if (date > existing.date) existing.date = date;
  if (data.rating != null) existing.rating = data.rating;
  if (data.hasReview) existing.hasReview = true;
  if (data.liked) existing.liked = true;
  if (data.logged) existing.logged = true;
}

/** All films/series a user has interacted with: rated, reviewed, logged or favourited. */
export async function getUserLibrary(
  userId: string,
  viewerId: string | null,
  take?: number,
): Promise<LibraryItem[]> {
  const allowed = await visibleVisibilitiesFor(userId, viewerId);
  const visWhere = allowed ? { visibility: { in: allowed } } : {};
  const mediaWhere = { mediaItem: { kind: { in: ["MOVIE", "SERIES"] } } };

  const [entries, ratings, reviews, likes] = await Promise.all([
    db.watchEntry.findMany({
      where: { userId, ...visWhere, ...mediaWhere },
      orderBy: { watchedOn: "desc" },
      ...(take ? { take: Math.max(take * 3, 30) } : {}),
      include: { mediaItem: { include: localMediaInclude } },
    }),
    db.rating.findMany({
      where: { userId, ...visWhere, ...mediaWhere },
      orderBy: { createdAt: "desc" },
      ...(take ? { take: Math.max(take * 3, 30) } : {}),
      include: { mediaItem: { include: localMediaInclude } },
    }),
    db.review.findMany({
      where: { userId, ...visWhere, ...mediaWhere },
      orderBy: { updatedAt: "desc" },
      ...(take ? { take: Math.max(take * 3, 30) } : {}),
      include: { mediaItem: { include: localMediaInclude } },
    }),
    db.like.findMany({
      where: { userId, targetType: "MEDIA" },
      orderBy: { createdAt: "desc" },
      ...(take ? { take: Math.max(take * 3, 30) } : {}),
    }),
  ]);

  const likedItems = likes.length
    ? await db.mediaItem.findMany({
        where: { id: { in: likes.map((like) => like.targetId) }, kind: { in: ["MOVIE", "SERIES"] } },
        include: localMediaInclude,
      })
    : [];
  const likedById = new Map(likedItems.map((item) => [item.id, item]));
  const map = new Map<string, { mediaItem: LocalMediaLinkInput & { id: string }; date: Date; rating: number | null; hasReview: boolean; liked: boolean; logged: boolean }>();

  for (const rating of ratings) {
    upsertLibraryItem(map, rating.mediaItem, rating.createdAt, { rating: rating.value });
  }
  for (const entry of entries) {
    upsertLibraryItem(map, entry.mediaItem, entry.watchedOn, { rating: entry.rating, logged: true });
  }
  for (const review of reviews) {
    upsertLibraryItem(map, review.mediaItem, review.updatedAt, { rating: review.rating, hasReview: true });
  }
  for (const like of likes) {
    const mediaItem = likedById.get(like.targetId);
    if (mediaItem) upsertLibraryItem(map, mediaItem, like.createdAt, { liked: true });
  }

  return [...map.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, take)
    .map((item) => ({
      mediaItemId: item.mediaItem.id,
      link: localMediaLink(item.mediaItem),
      rating: item.rating,
      date: item.date,
      hasReview: item.hasReview,
      liked: item.liked,
      logged: item.logged,
    }));
}

/** A user's favourited media (Like targetType = MEDIA). */
export async function getFavorites(userId: string, take = 12): Promise<{ mediaItemId: string; link: LocalMediaLink }[]> {
  const likes = await db.like.findMany({
    where: { userId, targetType: "MEDIA" },
    orderBy: { createdAt: "desc" },
    take,
  });
  if (likes.length === 0) return [];

  const items = await db.mediaItem.findMany({
    where: { id: { in: likes.map((l) => l.targetId) } },
    include: localMediaInclude,
  });
  const byId = new Map(items.map((m) => [m.id, m]));

  return likes
    .map((l) => byId.get(l.targetId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ mediaItemId: m.id, link: localMediaLink(m) }));
}

/** Distinct films counted as "seen" (logged OR rated). */
export async function countSeenFilms(userId: string): Promise<number> {
  const [logged, rated] = await Promise.all([
    db.watchEntry.findMany({
      where: { userId, mediaItem: { kind: "MOVIE" } },
      select: { mediaItemId: true },
      distinct: ["mediaItemId"],
    }),
    db.rating.findMany({
      where: { userId, mediaItem: { kind: "MOVIE" } },
      select: { mediaItemId: true },
    }),
  ]);
  return new Set([...logged.map((l) => l.mediaItemId), ...rated.map((r) => r.mediaItemId)]).size;
}
