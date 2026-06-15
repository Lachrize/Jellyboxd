import { db } from "@/lib/db";

/** Mark a title as seen without touching ratings, reviews or diary entries. */
export async function ensureSeenMedia(userId: string, mediaItemId: string) {
  await db.seenMedia.upsert({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    update: {},
    create: { userId, mediaItemId },
  });
}

/**
 * A rating counts as a viewing. Create the diary entry the first time a media
 * is rated, or just refresh the rating snapshot of the existing one — so
 * editing a note updates the journal line instead of adding a new one. Shared
 * by the in-app rate action and the Jellyfin inbound sync.
 */
export async function upsertRatingWatchEntry(
  userId: string,
  mediaItemId: string,
  value: number,
  options: { watchedOn?: Date; visibility?: string } = {},
) {
  const existing = await db.watchEntry.findFirst({
    where: { userId, mediaItemId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    await db.watchEntry.update({ where: { id: existing.id }, data: { rating: value } });
  } else {
    await db.watchEntry.create({
      data: {
        userId,
        mediaItemId,
        watchedOn: options.watchedOn ?? new Date(),
        rating: value,
        ...(options.visibility ? { visibility: options.visibility } : {}),
      },
    });
  }
}

/** Drop the rating snapshot from a media's diary entries, keeping the viewing. */
export async function clearRatingFromWatchEntries(userId: string, mediaItemId: string) {
  await db.watchEntry.updateMany({ where: { userId, mediaItemId }, data: { rating: null } });
}

/**
 * Remove auto-created (review-less) diary entries once a media is no longer seen
 * AND no longer rated — i.e. the user cleared everything (e.g. un-watched +
 * un-rated in Jellyfin). A rating-derived viewing should not outlive the rating
 * and the "seen" flag, otherwise the title lingers in the library/journal.
 * Entries that carry a written review are kept (a critique is deliberate).
 */
export async function pruneOrphanWatchEntries(userId: string, mediaItemId: string) {
  const [seen, rating] = await Promise.all([
    db.seenMedia.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId } }, select: { id: true } }),
    db.rating.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId } }, select: { id: true } }),
  ]);
  if (seen || rating) return; // still watched or rated -> keep the viewing
  await db.watchEntry.deleteMany({ where: { userId, mediaItemId, reviewId: null } });
  // Nothing left to surface -> drop the stale feed activity too, otherwise other
  // members keep seeing "X a journalisé …" for something X has fully removed.
  await db.activity.deleteMany({
    where: { actorId: userId, mediaItemId, type: { in: ["LOGGED", "RATED", "EPISODE_WATCHED"] } },
  });
}
