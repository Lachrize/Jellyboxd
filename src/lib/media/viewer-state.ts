import { db } from "@/lib/db";
import { getMediaProvider } from "./index";
import type { WatchProgressStatus } from "@/lib/constants";

export interface ViewerMediaState {
  mediaItemId: string | null;
  seriesId: string | null;
  userRating: number | null;
  inWatchlist: boolean;
  liked: boolean;
  seriesStatus: WatchProgressStatus | null;
}

/**
 * Resolves the local persistence state for a catalogue item the viewer is
 * looking at: their rating, watchlist membership and (for series) progress.
 * Returns empty state when the item hasn't been materialised locally yet.
 */
export async function getViewerMediaState(
  externalId: string,
  userId: string | null,
  providerName?: string,
): Promise<ViewerMediaState> {
  const provider = providerName ?? getMediaProvider().name;
  const mapping = await db.externalMapping.findUnique({
    where: { provider_externalId: { provider, externalId } },
    select: { mediaItem: { select: { id: true, series: { select: { id: true } } } } },
  });

  const mediaItemId = mapping?.mediaItem.id ?? null;
  const seriesId = mapping?.mediaItem.series?.id ?? null;

  if (!mediaItemId || !userId) {
    return { mediaItemId, seriesId, userRating: null, inWatchlist: false, liked: false, seriesStatus: null };
  }

  const [rating, watchlist, liked, progress] = await Promise.all([
    db.rating.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId } }, select: { value: true } }),
    db.list
      .findFirst({ where: { userId, kind: "WATCHLIST" }, select: { id: true } })
      .then((wl) =>
        wl
          ? db.listItem.findUnique({
              where: { listId_mediaItemId: { listId: wl.id, mediaItemId } },
              select: { id: true },
            })
          : null,
      ),
    db.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "MEDIA", targetId: mediaItemId } },
      select: { id: true },
    }),
    seriesId
      ? db.seriesProgress.findUnique({
          where: { userId_seriesId: { userId, seriesId } },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    mediaItemId,
    seriesId,
    userRating: rating?.value ?? null,
    inWatchlist: Boolean(watchlist),
    liked: Boolean(liked),
    seriesStatus: (progress?.status as WatchProgressStatus | undefined) ?? null,
  };
}
