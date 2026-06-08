import { db } from "@/lib/db";
import type { ReviewCardData } from "@/components/social/review-card";
import { localMediaInclude, localMediaLink, type LocalMediaLink } from "@/lib/media/local";
import { getFriendIds, visibleVisibilitiesFor } from "@/lib/services/friends";

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

export interface MediaReviewSections {
  friends: ReviewCardData[];
  community: ReviewCardData[];
}

/** Reviews for the media detail sections, split by audience. */
export async function getMediaReviewSections(
  mediaItemId: string,
  viewerId: string | null,
  take = 12,
): Promise<MediaReviewSections> {
  const friendIds = viewerId ? await getFriendIds(viewerId) : [];

  const [friends, community] = await Promise.all([
    friendIds.length
      ? db.review.findMany({
          where: {
            mediaItemId,
            userId: { in: friendIds },
            visibility: { in: ["PUBLIC", "FRIENDS"] },
          },
          include: { user: { select: { username: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
          distinct: ["userId"],
          take,
        })
      : Promise.resolve([]),
    db.review.findMany({
      where: { mediaItemId, visibility: "PUBLIC" },
      include: { user: { select: { username: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      take,
    }),
  ]);

  return {
    friends: await toReviewCardData(friends, viewerId),
    community: await toReviewCardData(community, viewerId),
  };
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
