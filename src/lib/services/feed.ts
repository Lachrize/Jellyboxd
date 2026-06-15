import { db } from "@/lib/db";
import { externalIdFor } from "@/lib/media/local";
import { mediaHref, seriesHref } from "@/lib/links";
import { safeJsonParse } from "@/lib/utils";

export interface FeedItem {
  id: string;
  type: string;
  createdAt: Date;
  actor: { username: string; name: string | null; avatarUrl: string | null };
  media: { title: string; kind: string; posterUrl: string | null; href: string | null } | null;
  rating: number | null;
  review: { id: string; body: string; containsSpoilers: boolean; likeCount: number; likedByViewer: boolean } | null;
  listTitle: string | null;
}

const parentSelect = {
  select: {
    mediaItem: {
      select: {
        title: true,
        posterUrl: true,
        externalMappings: { select: { provider: true, externalId: true } },
      },
    },
  },
};

const mediaSelect = {
  select: {
    title: true,
    kind: true,
    posterUrl: true,
    externalMappings: { select: { provider: true, externalId: true } },
    episode: { select: { series: parentSelect } },
    season: { select: { series: parentSelect } },
  },
};

type MediaShape = {
  title: string;
  kind: string;
  posterUrl: string | null;
  externalMappings: { provider: string; externalId: string }[];
  episode: { series: { mediaItem: ParentShape } } | null;
  season: { series: { mediaItem: ParentShape } } | null;
} | null;

type ParentShape = {
  title: string;
  posterUrl: string | null;
  externalMappings: { provider: string; externalId: string }[];
};

function mediaInfo(m: MediaShape): FeedItem["media"] {
  if (!m) return null;
  if (m.kind === "MOVIE" || m.kind === "SERIES") {
    const ext = externalIdFor(m.externalMappings);
    return { title: m.title, kind: m.kind, posterUrl: m.posterUrl, href: ext ? mediaHref(m.kind, ext) : null };
  }
  const parent = m.episode?.series.mediaItem ?? m.season?.series.mediaItem;
  if (parent) {
    const ext = externalIdFor(parent.externalMappings);
    return { title: m.title, kind: m.kind, posterUrl: m.posterUrl ?? parent.posterUrl, href: ext ? seriesHref(ext) : null };
  }
  return { title: m.title, kind: m.kind, posterUrl: m.posterUrl, href: null };
}

async function loadFeedActivities(
  userId: string,
  where: object,
  take: number,
): Promise<FeedItem[]> {
  const activities = await db.activity.findMany({
    where,
    include: {
      actor: { select: { username: true, name: true, avatarUrl: true } },
      mediaItem: mediaSelect,
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  // Enrich REVIEWED items with the review body + likes.
  const reviewIds = activities
    .filter((a) => a.type === "REVIEWED" && a.targetId)
    .map((a) => a.targetId!) as string[];

  const reviewsById = new Map<
    string,
    { id: string; body: string; containsSpoilers: boolean; likeCount: number; likedByViewer: boolean }
  >();

  if (reviewIds.length) {
    const [reviews, counts, mine] = await Promise.all([
      db.review.findMany({ where: { id: { in: reviewIds } }, select: { id: true, body: true, containsSpoilers: true } }),
      db.like.groupBy({ by: ["targetId"], where: { targetType: "REVIEW", targetId: { in: reviewIds } }, _count: { targetId: true } }),
      db.like.findMany({ where: { userId, targetType: "REVIEW", targetId: { in: reviewIds } }, select: { targetId: true } }),
    ]);
    const countMap = new Map(counts.map((c) => [c.targetId, c._count.targetId]));
    const likedSet = new Set(mine.map((m) => m.targetId));
    reviews.forEach((r) =>
      reviewsById.set(r.id, {
        id: r.id,
        body: r.body,
        containsSpoilers: r.containsSpoilers,
        likeCount: countMap.get(r.id) ?? 0,
        likedByViewer: likedSet.has(r.id),
      }),
    );
  }

  return activities.map((a) => {
    const data = safeJsonParse<{ rating?: number | null; title?: string }>(a.data, {});
    return {
      id: a.id,
      type: a.type,
      createdAt: a.createdAt,
      actor: a.actor,
      media: mediaInfo(a.mediaItem as MediaShape),
      rating: data.rating ?? null,
      review: a.type === "REVIEWED" && a.targetId ? reviewsById.get(a.targetId) ?? null : null,
      listTitle: data.title ?? null,
    };
  });
}

/** Activity stream from everyone on the server (including the viewer). */
export async function getFeed(userId: string, take = 30): Promise<FeedItem[]> {
  return loadFeedActivities(userId, {}, take);
}

/** Activity from everyone else for the home social section. */
export async function getFriendsFeed(userId: string, take = 12): Promise<FeedItem[]> {
  return loadFeedActivities(userId, { NOT: { actorId: userId } }, take);
}
