import { db } from "@/lib/db";

/** Mark a title as seen without touching ratings, reviews or diary entries. */
export async function ensureSeenMedia(userId: string, mediaItemId: string) {
  await db.seenMedia.upsert({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    update: {},
    create: { userId, mediaItemId },
  });
}
