import { enqueuePendingSync } from "@/lib/sync/pending";

export interface OutboundChanges {
  played?: boolean;
  favorite?: boolean;
  rating?: number | null; // null clears; undefined leaves untouched
}

/**
 * Queue a Jellyboxd change for the user's Jellyfin server. The Jellyboxd plugin
 * cannot host HTTP endpoints, so instead of pushing directly it polls Jellyboxd:
 * we record the change in `PendingSync` and the plugin pulls + applies it
 * (GET/POST /api/sync/pending). This also works for LAN-only Jellyfin servers.
 */
export async function pushToJellyfin(userId: string, mediaItemId: string, changes: OutboundChanges): Promise<void> {
  try {
    await enqueuePendingSync(userId, mediaItemId, changes);
  } catch (error) {
    console.error("[jellyboxd] enqueue outbound sync failed:", error);
  }
}
