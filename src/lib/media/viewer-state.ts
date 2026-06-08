import { db } from "@/lib/db";
import { getMediaProvider } from "./index";
import type { WatchProgressStatus } from "@/lib/constants";

export interface ViewerMediaState {
  mediaItemId: string | null;
  seriesId: string | null;
  userRating: number | null;
  ratingSourceTitle: string | null;
  ratingImportSource: string | null;
  watched: boolean;
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
    return {
      mediaItemId,
      seriesId,
      userRating: null,
      ratingSourceTitle: null,
      ratingImportSource: null,
      watched: false,
      inWatchlist: false,
      liked: false,
      seriesStatus: null,
    };
  }

  const [rating, seen, watchlist, liked, progress] = await Promise.all([
    db.rating.findUnique({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      select: { value: true, sourceTitle: true, importSource: true },
    }),
    db.seenMedia.findUnique({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      select: { id: true },
    }),
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
    ratingSourceTitle: rating?.sourceTitle ?? null,
    ratingImportSource: rating?.importSource ?? null,
    watched: Boolean(seen || rating),
    inWatchlist: Boolean(watchlist),
    liked: Boolean(liked),
    seriesStatus: (progress?.status as WatchProgressStatus | undefined) ?? null,
  };
}
