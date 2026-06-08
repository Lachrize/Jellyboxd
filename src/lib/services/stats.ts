import { db } from "@/lib/db";

export type StatsEntry = {
  mediaItemId: string;
  rating: number | null;
  mediaItem: {
    kind: string;
    runtime: number | null;
    genres: { name: string }[];
    series: { totalEpisodes: number | null } | null;
  };
};

/** Union of diary entries and standalone ratings — a rating counts as seen, like on Letterboxd. */
export async function getUserStatsEntries(userId: string): Promise<StatsEntry[]> {
  const mediaSelect = {
    kind: true,
    runtime: true,
    genres: { select: { name: true } },
    series: { select: { totalEpisodes: true } },
  } as const;

  const [ratings, watchEntries] = await Promise.all([
    db.rating.findMany({
      where: { userId, mediaItem: { kind: { in: ["MOVIE", "SERIES", "EPISODE"] } } },
      select: { mediaItemId: true, value: true, mediaItem: { select: mediaSelect } },
    }),
    db.watchEntry.findMany({
      where: { userId, mediaItem: { kind: { in: ["MOVIE", "SERIES", "EPISODE"] } } },
      select: { mediaItemId: true, rating: true, mediaItem: { select: mediaSelect } },
    }),
  ]);

  const map = new Map<string, StatsEntry>();

  for (const rating of ratings) {
    map.set(rating.mediaItemId, {
      mediaItemId: rating.mediaItemId,
      rating: rating.value,
      mediaItem: rating.mediaItem,
    });
  }

  for (const entry of watchEntries) {
    const existing = map.get(entry.mediaItemId);
    if (existing) {
      if (entry.rating != null) existing.rating = entry.rating;
    } else {
      map.set(entry.mediaItemId, {
        mediaItemId: entry.mediaItemId,
        rating: entry.rating,
        mediaItem: entry.mediaItem,
      });
    }
  }

  return [...map.values()];
}
