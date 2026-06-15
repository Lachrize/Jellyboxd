import { db } from "@/lib/db";
import type { ReviewCardData } from "@/components/social/review-card";
import { localMediaInclude, localMediaLink, type LocalMediaLink } from "@/lib/media/local";
import { visibleVisibilitiesFor } from "@/lib/services/friends";

async function enrichLikes(reviewIds: string[], viewerId: string | null) {
  if (!reviewIds.length) return { countMap: new Map<string, number>(), likedSet: new Set<string>() };
  const [counts, mine] = await Promise.all([
    db.like.groupBy({
      by: ["targetId"],
      where: { targetType: "REVIEW", targetId: { in: reviewIds } },
      _count: { targetId: true },
    }),
    viewerId
      ? db.like.findMany({
          where: { userId: viewerId, targetType: "REVIEW", targetId: { in: reviewIds } },
          select: { targetId: true },
        })
      : Promise.resolve([]),
  ]);
  return {
    countMap: new Map(counts.map((c) => [c.targetId, c._count.targetId])),
    likedSet: new Set(mine.map((m) => m.targetId)),
  };
}

type ReviewRow = {
  id: string;
  body: string;
  rating: number | null;
  containsSpoilers: boolean;
  createdAt: Date;
  visibility: string;
  user: { username: string; name: string | null; avatarUrl: string | null };
};

async function toReviewCardData(reviews: ReviewRow[], viewerId: string | null): Promise<ReviewCardData[]> {
  if (reviews.length === 0) return [];

  const { countMap, likedSet } = await enrichLikes(reviews.map((r) => r.id), viewerId);

  return reviews.map((r) => ({
    id: r.id,
    body: r.body,
    rating: r.rating,
    containsSpoilers: r.containsSpoilers,
    createdAt: r.createdAt,
    user: r.user,
    visibility: r.visibility,
    likeCount: countMap.get(r.id) ?? 0,
    likedByViewer: likedSet.has(r.id),
  }));
}

/** All reviews for a media item — one shared, public list (latest per user). */
export async function getMediaReviews(
  mediaItemId: string,
  viewerId: string | null,
  take = 24,
): Promise<ReviewCardData[]> {
  const reviews = await db.review.findMany({
    where: { mediaItemId },
    include: { user: { select: { username: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    distinct: ["userId"],
    take,
  });
  return toReviewCardData(reviews, viewerId);
}

export interface UserReview {
  data: ReviewCardData;
  media: LocalMediaLink;
}

/** A user's own reviews (for their profile), with media context + like state. */
export async function getUserReviews(
  userId: string,
  viewerId: string | null,
  take = 6,
): Promise<UserReview[]> {
  const allowed = await visibleVisibilitiesFor(userId, viewerId);
  const reviews = await db.review.findMany({
    where: { userId, ...(allowed ? { visibility: { in: allowed } } : {}) },
    include: {
      user: { select: { username: true, name: true, avatarUrl: true } },
      mediaItem: { include: localMediaInclude },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  if (reviews.length === 0) return [];

  const { countMap, likedSet } = await enrichLikes(reviews.map((r) => r.id), viewerId);

  return reviews.map((r) => ({
    data: {
      id: r.id,
      body: r.body,
      rating: r.rating,
      containsSpoilers: r.containsSpoilers,
      createdAt: r.createdAt,
      user: r.user,
      visibility: r.visibility,
      likeCount: countMap.get(r.id) ?? 0,
      likedByViewer: likedSet.has(r.id),
    },
    media: localMediaLink(r.mediaItem),
  }));
}
