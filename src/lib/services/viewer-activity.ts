import { db } from "@/lib/db";
import type { ViewerEntry } from "@/components/tracking/viewer-entries";

/**
 * Returns what should appear in "Votre avis" for the current viewer.
 * Diary entries win, then standalone ratings (Letterboxd imports), then a bare seen flag.
 */
export async function getViewerActivityEntries(
  userId: string | null | undefined,
  mediaItemId: string | null | undefined,
): Promise<ViewerEntry[]> {
  if (!userId || !mediaItemId) return [];

  const [entry, rating, seen] = await Promise.all([
    db.watchEntry.findFirst({
      where: { userId, mediaItemId },
      orderBy: { watchedOn: "desc" },
      include: { review: { select: { body: true, containsSpoilers: true } } },
    }),
    db.rating.findUnique({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      select: { id: true, value: true, createdAt: true },
    }),
    db.seenMedia.findUnique({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      select: { id: true, createdAt: true },
    }),
  ]);

  if (entry) {
    return [
      {
        id: entry.id,
        watchedOn: entry.watchedOn,
        rating: entry.rating ?? rating?.value ?? null,
        rewatch: entry.rewatch,
        liked: entry.liked,
        review: entry.review,
      },
    ];
  }

  if (rating) {
    return [
      {
        id: rating.id,
        watchedOn: rating.createdAt,
        rating: rating.value,
        rewatch: false,
        liked: false,
        review: null,
      },
    ];
  }

  if (seen) {
    return [
      {
        id: seen.id,
        watchedOn: seen.createdAt,
        rating: null,
        rewatch: false,
        liked: false,
        review: null,
      },
    ];
  }

  return [];
}
