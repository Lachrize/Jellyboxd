import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Product analytics for the admin dashboard: growth, engagement, distributions
 * and "top" leaderboards — all driven by two filters:
 *   - period:   time window (KPIs, charts, distribution, leaderboards)
 *   - mediaType: Films / Séries (distribution + media leaderboards)
 * Read-only; mutations live in server/actions/admin.ts.
 */

const DAY = 24 * 60 * 60 * 1000;
const MIN_RATINGS_FOR_BEST = 2;

export const PERIODS = ["7d", "30d", "90d", "12m", "all"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
  "12m": "12 mois",
  all: "Tout",
};

export const MEDIA_TYPES = ["all", "movie", "series"] as const;
export type MediaTypeFilter = (typeof MEDIA_TYPES)[number];
export const MEDIA_TYPE_LABELS: Record<MediaTypeFilter, string> = {
  all: "Films & séries",
  movie: "Films",
  series: "Séries",
};

const SINCE_DAYS: Record<Exclude<Period, "all">, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

function bucketDays(rows: Array<{ createdAt: Date }>, start: Date, days: number) {
  const base = new Date(start);
  base.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() + i * DAY);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, value]) => ({
    label: key.slice(5).replace("-", "/"),
    value,
    title: new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  }));
}

function bucketMonths(rows: Array<{ createdAt: Date }>, months: number) {
  const now = new Date();
  const counts = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    counts.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, value]) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y!, m! - 1, 1);
    return {
      value,
      label: `${d.toLocaleDateString("fr-FR", { month: "short" })} ${String(y).slice(2)}`,
      title: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  });
}

export async function getAdminDashboard({
  period = "30d",
  mediaType = "all",
}: { period?: Period; mediaType?: MediaTypeFilter } = {}) {
  const now = new Date();
  const since = period === "all" ? undefined : new Date(now.getTime() - SINCE_DAYS[period] * DAY);
  const kind = mediaType === "movie" ? "MOVIE" : mediaType === "series" ? "SERIES" : undefined;

  const dateWhere = since ? { createdAt: { gte: since } } : {};
  const mediaWhere = kind ? { mediaItem: { kind } } : {};
  const ratingWhere: Prisma.RatingWhereInput = { ...dateWhere, ...mediaWhere };
  const reviewWhere: Prisma.ReviewWhereInput = { ...dateWhere, ...mediaWhere };

  // Chart window: daily for short periods, monthly for long ones.
  const monthly = period === "12m" || period === "all";
  const dayCount = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const monthCount = period === "12m" ? 12 : 24;
  const chartStart = monthly
    ? new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1)
    : new Date(now.getTime() - (dayCount - 1) * DAY);

  const [
    totalUsers,
    newUsers,
    activeRows,
    ratingsAdded,
    reviewsAdded,
    listsAdded,
    favoritesAdded,
    avgAgg,
    signupRows,
    activityRows,
    ratingDistRows,
    ratingGroups,
    reviewGroups,
    favGroups,
    followGroups,
    activityByUser,
    topGenres,
    userList,
    sessionAgg,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: dateWhere }),
    db.activity.findMany({ where: dateWhere, distinct: ["actorId"], select: { actorId: true } }),
    db.rating.count({ where: ratingWhere }),
    db.review.count({ where: reviewWhere }),
    db.list.count({ where: dateWhere }),
    db.like.count({ where: { targetType: "MEDIA", ...dateWhere } }),
    db.rating.aggregate({ _avg: { value: true }, where: ratingWhere }),
    db.user.findMany({ where: { createdAt: { gte: chartStart } }, select: { createdAt: true } }),
    db.activity.findMany({ where: { createdAt: { gte: chartStart } }, select: { createdAt: true } }),
    db.rating.groupBy({ by: ["value"], where: ratingWhere, _count: { _all: true } }),
    db.rating.groupBy({ by: ["mediaItemId"], where: ratingWhere, _count: { _all: true }, _avg: { value: true } }),
    db.review.groupBy({ by: ["mediaItemId"], where: reviewWhere, _count: { _all: true } }),
    db.like.groupBy({ by: ["targetId"], where: { targetType: "MEDIA", ...dateWhere }, _count: { _all: true } }),
    db.follow.groupBy({ by: ["followingId"], _count: { _all: true } }),
    db.activity.groupBy({ by: ["actorId"], where: dateWhere, _count: { _all: true } }),
    db.genre.findMany({ orderBy: { mediaItems: { _count: "desc" } }, take: 8, select: { name: true, _count: { select: { mediaItems: true } } } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, name: true, avatarUrl: true, isAdmin: true, jellyfinUserId: true, createdAt: true,
        _count: { select: { ratings: true, reviews: true, watchEntries: true, lists: true } },
      },
    }),
    db.session.groupBy({ by: ["userId"], _max: { createdAt: true } }),
  ]);

  // ---- leaderboards (sorted in JS) ----
  const mostRated = [...ratingGroups].sort((a, b) => b._count._all - a._count._all).slice(0, 8);
  const bestRated = ratingGroups
    .filter((g) => g._count._all >= MIN_RATINGS_FOR_BEST)
    .sort((a, b) => (b._avg.value ?? 0) - (a._avg.value ?? 0))
    .slice(0, 8);
  const mostReviewed = [...reviewGroups].sort((a, b) => b._count._all - a._count._all).slice(0, 8);
  const favSorted = [...favGroups].sort((a, b) => b._count._all - a._count._all);
  const mostFollowed = [...followGroups].sort((a, b) => b._count._all - a._count._all).slice(0, 8);
  const topActors = [...activityByUser].sort((a, b) => b._count._all - a._count._all).slice(0, 8);

  // resolve names (favorites need kind filtering post-hoc since Like isn't relational)
  const mediaIds = [
    ...new Set([
      ...mostRated.map((g) => g.mediaItemId),
      ...bestRated.map((g) => g.mediaItemId),
      ...mostReviewed.map((g) => g.mediaItemId),
      ...favSorted.map((g) => g.targetId),
    ]),
  ];
  const [mediaRows, followedUsers, actorUsers] = await Promise.all([
    db.mediaItem.findMany({ where: { id: { in: mediaIds } }, select: { id: true, title: true, year: true, kind: true } }),
    db.user.findMany({ where: { id: { in: mostFollowed.map((g) => g.followingId) } }, select: { id: true, username: true, name: true } }),
    db.user.findMany({ where: { id: { in: topActors.map((g) => g.actorId) } }, select: { id: true, username: true, name: true } }),
  ]);
  const mediaMap = new Map(mediaRows.map((m) => [m.id, m]));
  const followedMap = new Map(followedUsers.map((u) => [u.id, u]));
  const actorMap = new Map(actorUsers.map((u) => [u.id, u]));
  const title = (id: string) => {
    const m = mediaMap.get(id);
    return m ? `${m.title}${m.year ? ` (${m.year})` : ""}` : "—";
  };
  const kindLabel = (id: string) => (mediaMap.get(id)?.kind === "SERIES" ? "Série" : "Film");

  const mostFavorited = favSorted
    .filter((g) => !kind || mediaMap.get(g.targetId)?.kind === kind)
    .slice(0, 8);

  const lastSeen = new Map(sessionAgg.map((s) => [s.userId, s._max.createdAt]));

  const distMap = new Map(ratingDistRows.map((r) => [r.value, r._count._all]));
  const ratingDistribution = Array.from({ length: 10 }, (_, i) => {
    const v = i + 1;
    const count = distMap.get(v) ?? 0;
    const pct = ratingsAdded > 0 ? Math.round((count / ratingsAdded) * 100) : 0;
    const stars = String(v / 2).replace(".", ",");
    return { label: stars, value: count, title: `${stars}★`, detail: `${count} note${count > 1 ? "s" : ""} · ${pct}%` };
  });

  return {
    filters: { period, mediaType, periodLabel: PERIOD_LABELS[period], mediaLabel: MEDIA_TYPE_LABELS[mediaType] },
    kpis: {
      totalUsers,
      newUsers,
      active: activeRows.length,
      ratings: ratingsAdded,
      reviews: reviewsAdded,
      lists: listsAdded,
      favorites: favoritesAdded,
      avgStars: avgAgg._avg.value ? (avgAgg._avg.value / 2).toFixed(2).replace(".", ",") : "—",
      ratedMedia: ratingGroups.length,
    },
    charts: {
      signups: monthly ? bucketMonths(signupRows, monthCount) : bucketDays(signupRows, chartStart, dayCount),
      activity: monthly ? bucketMonths(activityRows, monthCount) : bucketDays(activityRows, chartStart, dayCount),
      ratingDistribution,
    },
    tops: {
      mostRated: mostRated.map((g) => ({
        title: title(g.mediaItemId),
        subtitle: `${kindLabel(g.mediaItemId)} · moy. ${((g._avg.value ?? 0) / 2).toFixed(1).replace(".", ",")}★`,
        value: g._count._all,
        valueLabel: `${g._count._all} notes`,
      })),
      bestRated: bestRated.map((g) => ({
        title: title(g.mediaItemId),
        subtitle: `${kindLabel(g.mediaItemId)} · ${g._count._all} notes`,
        value: Math.round((g._avg.value ?? 0) * 10),
        valueLabel: `${((g._avg.value ?? 0) / 2).toFixed(2).replace(".", ",")}★`,
      })),
      mostReviewed: mostReviewed.map((g) => ({
        title: title(g.mediaItemId),
        subtitle: kindLabel(g.mediaItemId),
        value: g._count._all,
        valueLabel: `${g._count._all} crit.`,
      })),
      mostFavorited: mostFavorited.map((g) => ({
        title: title(g.targetId),
        subtitle: kindLabel(g.targetId),
        value: g._count._all,
        valueLabel: `${g._count._all} ♥`,
      })),
      mostFollowed: mostFollowed.map((g) => {
        const u = followedMap.get(g.followingId);
        return { title: u ? `@${u.username}` : "—", subtitle: u?.name ?? undefined, value: g._count._all, valueLabel: `${g._count._all} abonnés` };
      }),
      topUsers: topActors.map((g) => {
        const u = actorMap.get(g.actorId);
        return { title: u ? `@${u.username}` : "—", subtitle: u?.name ?? undefined, value: g._count._all, valueLabel: `${g._count._all} actions` };
      }),
      topGenres: topGenres.map((g) => ({ title: g.name, value: g._count.mediaItems, valueLabel: `${g._count.mediaItems}` })),
    },
    users: userList.map((u) => ({ ...u, lastSeen: lastSeen.get(u.id) ?? null })),
  };
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
