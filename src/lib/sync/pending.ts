import { db } from "@/lib/db";

/**
 * The outbound queue (Jellyboxd -> Jellyfin). When a user changes watch state /
 * rating / favourite in Jellyboxd we upsert a single row per (user, media) that
 * the plugin pulls via GET /api/sync/pending and acks via POST. Because the
 * plugin makes the request, this reaches Jellyfin servers that are LAN-only.
 */

export interface PendingChangeInput {
  played?: boolean;
  favorite?: boolean;
  rating?: number | null; // null clears, undefined leaves untouched
}

/** One queued change in the shape the plugin's `PendingChange` expects. */
export interface PendingChangeDto {
  id: string;
  jellyfinUserId: string; // which Jellyfin user to apply this to
  jellyfinUsername: string | null; // their Jellyfin display name (reliable lookup key)
  updatedAt: string;
  kind: string;
  tmdb: string | null;
  seriesTmdb: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  played: boolean | null;
  rating: number | null; // null = no change, 0 = clear, 1..10 = set
  favorite: boolean | null;
}

/**
 * Merge a change into the user's pending queue. Only the provided fields move;
 * `null`/`undefined` columns mean "no change" so the plugin leaves them alone.
 * A cleared rating is stored as 0 (the plugin's sentinel for "clear").
 */
export async function enqueuePendingSync(
  userId: string,
  mediaItemId: string,
  changes: PendingChangeInput,
): Promise<void> {
  const data: { played?: boolean; favorite?: boolean; rating?: number } = {};
  if (changes.played !== undefined) data.played = changes.played;
  if (changes.favorite !== undefined) data.favorite = changes.favorite;
  if (changes.rating !== undefined) data.rating = changes.rating === null ? 0 : changes.rating;
  if (Object.keys(data).length === 0) return;

  await db.pendingSync.upsert({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    update: data, // partial update => only these columns move; @updatedAt bumps
    create: { userId, mediaItemId, ...data },
  });
}

/**
 * Read the whole outbound queue (all users) and serialise it to the plugin's
 * wire format. Each change carries the `jellyfinUserId` so the plugin applies it
 * to the right Jellyfin account. Rows for accounts not linked to a Jellyfin user
 * are skipped (nothing to apply them to).
 */
export async function getPendingChanges(): Promise<PendingChangeDto[]> {
  const rows = await db.pendingSync.findMany({
    where: { user: { jellyfinUserId: { not: null } } },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      updatedAt: true,
      played: true,
      rating: true,
      favorite: true,
      user: { select: { jellyfinUserId: true, name: true } },
      mediaItem: {
        select: {
          kind: true,
          externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } },
          episode: {
            select: {
              seasonNumber: true,
              episodeNumber: true,
              series: { select: { mediaItem: { select: { externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } } } } } },
            },
          },
          season: {
            select: {
              seasonNumber: true,
              series: { select: { mediaItem: { select: { externalMappings: { where: { provider: "TMDB" }, select: { externalId: true } } } } } },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const m = row.mediaItem;
    const ownTmdb = m.externalMappings[0]?.externalId ?? null;
    const seriesTmdb =
      m.episode?.series.mediaItem.externalMappings[0]?.externalId ??
      m.season?.series.mediaItem.externalMappings[0]?.externalId ??
      null;
    return {
      id: row.id,
      jellyfinUserId: row.user.jellyfinUserId as string, // filtered non-null in the query
      jellyfinUsername: row.user.name,
      updatedAt: row.updatedAt.toISOString(),
      kind: m.kind,
      tmdb: m.kind === "MOVIE" || m.kind === "SERIES" ? ownTmdb : null,
      seriesTmdb,
      seasonNumber: m.episode?.seasonNumber ?? m.season?.seasonNumber ?? null,
      episodeNumber: m.episode?.episodeNumber ?? null,
      played: row.played,
      rating: row.rating,
      favorite: row.favorite,
    };
  });
}

/**
 * Every Jellyfin item Jellyboxd has set a RATING on (per user), as
 * (jellyfinUserId, jellyfinItemId) pairs. The plugin reads this on uninstall to
 * remove exactly the notes it pushed into Jellyfin — and nothing else (played /
 * favourite, which may predate Jellyboxd, are left untouched).
 */
export async function getSyncedRatedItems(): Promise<{ jellyfinUserId: string; jellyfinItemId: string }[]> {
  const rows = await db.syncLink.findMany({
    where: { rating: { not: null }, jellyfinItemId: { not: null }, user: { jellyfinUserId: { not: null } } },
    select: { jellyfinItemId: true, user: { select: { jellyfinUserId: true } } },
  });
  return rows
    .filter((r) => r.user.jellyfinUserId && r.jellyfinItemId)
    .map((r) => ({ jellyfinUserId: r.user.jellyfinUserId as string, jellyfinItemId: r.jellyfinItemId as string }));
}

/**
 * Drop acked rows, but only if they haven't changed since the plugin read them
 * (`updatedAt` must match). A note re-edited between pull and ack survives.
 */
export async function ackPendingChanges(
  acks: { id: string; updatedAt: string }[],
): Promise<number> {
  let removed = 0;
  for (const ack of acks) {
    const at = new Date(ack.updatedAt);
    if (Number.isNaN(at.getTime())) continue;
    const res = await db.pendingSync.deleteMany({
      where: { id: ack.id, updatedAt: at },
    });
    removed += res.count;
  }
  return removed;
}
