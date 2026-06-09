import { db } from "@/lib/db";

export interface OutboundChanges {
  played?: boolean;
  favorite?: boolean;
  rating?: number | null; // null clears; undefined leaves untouched
}

/**
 * Enqueue a Jellyboxd change for the user's Jellyfin plugin to pull and apply
 * locally (works even when the user's server is LAN-only). Movies & whole series
 * sync watched/rating/favourite; seasons & episodes sync only "watched".
 * The pending row is merged so the plugin always applies the latest state.
 */
export async function pushToJellyfin(userId: string, mediaItemId: string, changes: OutboundChanges): Promise<void> {
  try {
    const item = await db.mediaItem.findUnique({ where: { id: mediaItemId }, select: { kind: true } });
    if (!item || !["MOVIE", "SERIES", "SEASON", "EPISODE"].includes(item.kind)) return;
    const fullSync = item.kind === "MOVIE" || item.kind === "SERIES";

    const data: { played?: boolean; rating?: number; favorite?: boolean } = {};
    if (changes.played !== undefined) data.played = changes.played;
    if (fullSync && changes.favorite !== undefined) data.favorite = changes.favorite;
    if (fullSync && changes.rating !== undefined) data.rating = changes.rating === null ? 0 : changes.rating; // 0 = clear

    if (data.played === undefined && data.favorite === undefined && data.rating === undefined) return;

    await db.pendingSync.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      update: data,
      create: { userId, mediaItemId, ...data },
    });
  } catch (error) {
    console.error("[jellyboxd] enqueue outbound failed:", error);
  }
}
