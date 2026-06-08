import { db } from "@/lib/db";
import { localMediaInclude, localMediaLink, type LocalMediaLink } from "@/lib/media/local";
import { visibleVisibilitiesFor } from "@/lib/services/friends";

export interface SeenItem {
  mediaItemId: string;
  link: LocalMediaLink;
  rating: number | null;
  date: Date;
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
      where: { userId, ...visWhere },
      orderBy: { watchedOn: "desc" },
      take: 40,
      include: { mediaItem: { include: localMediaInclude } },
    }),
    db.rating.findMany({
      where: { userId, ...visWhere },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: { mediaItem: { include: localMediaInclude } },
    }),
  ]);

  const map = new Map<string, { date: Date; mediaItem: (typeof entries)[number]["mediaItem"]; rating: number | null }>();

  for (const r of ratings) {
    map.set(r.mediaItemId, { date: r.updatedAt, mediaItem: r.mediaItem, rating: r.value });
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
