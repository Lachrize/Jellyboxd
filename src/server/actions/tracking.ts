"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { resolveMediaRef } from "@/lib/media/upsert";
import { recordActivity } from "@/lib/services/activity";
import { getOrCreateWatchlist } from "@/lib/services/lists";
import { ensureSeenMedia } from "@/lib/services/seen";
import { pushToJellyfin } from "@/lib/jellyfin/outbound";
import { slugify } from "@/lib/utils";
import { logWatchSchema, rateSchema } from "@/lib/validation/tracking";
import { mediaRefSchema } from "@/lib/validation/media";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

function refreshFeeds() {
  revalidatePath("/home");
  revalidatePath("/journal");
}

/** Persist the chosen visibility as the user's remembered default. */
async function rememberVisibility(userId: string, visibility?: string) {
  if (visibility) await db.user.update({ where: { id: userId }, data: { defaultVisibility: visibility } });
}

async function connectTags(names: string[] | undefined) {
  if (!names?.length) return undefined;
  const ids: { id: string }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);
    const tag = await db.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
    ids.push({ id: tag.id });
  }
  return ids.length ? { connect: ids } : undefined;
}

async function replaceTrackingActivity(userId: string, mediaItemId: string) {
  await db.activity.deleteMany({
    where: {
      actorId: userId,
      mediaItemId,
      type: { in: ["LOGGED", "RATED", "REVIEWED"] },
    },
  });
}

/** Set or clear the canonical rating for a media item. */
export async function rateAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const mediaItemId = await resolveMediaRef(parsed.data.ref);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  const visibility = parsed.data.visibility;
  await rememberVisibility(user.id, visibility);

  if (parsed.data.value == null) {
    await db.rating.deleteMany({ where: { userId: user.id, mediaItemId } });
    await pushToJellyfin(user.id, mediaItemId, { rating: null });
  } else {
    await db.rating.upsert({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      update: { value: parsed.data.value, ...(visibility ? { visibility } : {}) },
      create: { userId: user.id, mediaItemId, value: parsed.data.value, ...(visibility ? { visibility } : {}) },
    });
    await db.activity.deleteMany({
      where: { actorId: user.id, mediaItemId, type: "RATED" },
    });
    await ensureSeenMedia(user.id, mediaItemId);
    await recordActivity({
      actorId: user.id,
      type: "RATED",
      mediaItemId,
      data: { rating: parsed.data.value },
      visibility,
    });
    // Rating implies "seen" in Jellyboxd -> mirror both to Jellyfin.
    await pushToJellyfin(user.id, mediaItemId, { rating: parsed.data.value, played: true });
  }
  refreshFeeds();
  return { ok: true };
}

/** Create or update a diary entry (the core logging action). */
export async function logWatchAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = logWatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const d = parsed.data;
  const mediaItemId = await resolveMediaRef(d.ref);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  const watchedOn = d.watchedOn ?? new Date();
  const reviewBody = d.reviewBody?.trim();
  const tags = await connectTags(d.tags);
  const visibility = d.visibility;
  await rememberVisibility(user.id, visibility);

  const existingEntry = await db.watchEntry.findFirst({
    where: { userId: user.id, mediaItemId },
    orderBy: { createdAt: "desc" },
    select: { id: true, reviewId: true },
  });
  const existingReview = await db.review.findFirst({
    where: { userId: user.id, mediaItemId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  let reviewId: string | null = existingEntry?.reviewId ?? existingReview?.id ?? null;
  let activityType: "LOGGED" | "RATED" | "REVIEWED" = "LOGGED";

  if (reviewBody) {
    const reviewFields = {
      body: reviewBody,
      rating: d.rating ?? null,
      containsSpoilers: d.containsSpoilers ?? false,
      visibility,
    };
    const review = reviewId
      ? await db.review.update({
          where: { id: reviewId },
          data: { ...reviewFields, tags: { set: [], ...(tags ?? {}) } },
        })
      : await db.review.create({
          data: {
            userId: user.id,
            mediaItemId,
            ...reviewFields,
            ...(tags ? { tags } : {}),
          },
        });
    reviewId = review.id;
    activityType = "REVIEWED";
  } else if (d.rating != null) {
    activityType = "RATED";
  }

  const entryFields = {
    watchedOn,
    rewatch: d.rewatch ?? false,
    liked: d.liked ?? false,
    rating: d.rating ?? null,
    visibility,
    reviewId,
  };
  const entry = existingEntry
    ? await db.watchEntry.update({
        where: { id: existingEntry.id },
        data: {
          ...entryFields,
          ...(reviewId ? {} : { tags: { set: [], ...(tags ?? {}) } }),
        },
      })
    : await db.watchEntry.create({
        data: {
          userId: user.id,
          mediaItemId,
          ...entryFields,
          ...(reviewId ? {} : tags ? { tags } : {}),
        },
      });

  await ensureSeenMedia(user.id, mediaItemId);

  await db.watchEntry.deleteMany({
    where: { userId: user.id, mediaItemId, NOT: { id: entry.id } },
  });
  if (reviewId) {
    await db.review.deleteMany({
      where: { userId: user.id, mediaItemId, NOT: { id: reviewId } },
    });
  }
  await replaceTrackingActivity(user.id, mediaItemId);

  if (d.rating != null) {
    await db.rating.upsert({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      update: { value: d.rating, ...(visibility ? { visibility } : {}) },
      create: { userId: user.id, mediaItemId, value: d.rating, ...(visibility ? { visibility } : {}) },
    });
  }

  await recordActivity({
    actorId: user.id,
    type: activityType,
    mediaItemId,
    targetType: reviewId ? "REVIEW" : "WATCH_ENTRY",
    targetId: reviewId ?? entry.id,
    data: { rating: d.rating ?? null, liked: d.liked ?? false, rewatch: d.rewatch ?? false },
    visibility,
  });

  // Mirror the watch (and rating, if any) to Jellyfin. Review text = phase 3.
  await pushToJellyfin(user.id, mediaItemId, {
    played: true,
    ...(d.rating != null ? { rating: d.rating } : {}),
  });

  refreshFeeds();
  return { ok: true, data: { entryId: entry.id } };
}

/** Add/remove a media item from the user's watchlist. Returns the new state. */
export async function toggleWatchlistAction(
  ref: unknown,
): Promise<ActionResult<{ inWatchlist: boolean }>> {
  const user = await requireUser();
  const parsed = mediaRefSchema.safeParse(ref);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const mediaItemId = await resolveMediaRef(parsed.data);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  const watchlist = await getOrCreateWatchlist(user.id);
  const existing = await db.listItem.findUnique({
    where: { listId_mediaItemId: { listId: watchlist.id, mediaItemId } },
  });

  if (existing) {
    await db.listItem.delete({ where: { id: existing.id } });
    refreshFeeds();
    return { ok: true, data: { inWatchlist: false } };
  }

  const count = await db.listItem.count({ where: { listId: watchlist.id } });
  await db.listItem.create({ data: { listId: watchlist.id, mediaItemId, position: count } });
  await recordActivity({ actorId: user.id, type: "WATCHLIST_ADDED", mediaItemId });
  refreshFeeds();
  return { ok: true, data: { inWatchlist: true } };
}

/** Quick "mark watched today" — a one-tap diary entry without a form. */
export async function quickLogAction(ref: unknown): Promise<ActionResult> {
  return logWatchAction({ ref });
}

/** Toggle a bare "seen" state without requiring a rating, review or diary note. */
export async function setMediaWatchedAction(input: {
  ref: unknown;
  watched: boolean;
}): Promise<ActionResult<{ watched: boolean }>> {
  const user = await requireUser();
  const parsed = mediaRefSchema.safeParse(input.ref);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const mediaItemId = await resolveMediaRef(parsed.data);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  if (input.watched) {
    const existing = await db.seenMedia.findUnique({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      select: { id: true },
    });
    if (!existing) {
      await ensureSeenMedia(user.id, mediaItemId);
      await recordActivity({
        actorId: user.id,
        type: parsed.data.kind === "EPISODE" ? "EPISODE_WATCHED" : "LOGGED",
        mediaItemId,
        visibility: user.defaultVisibility,
      });
    }
  } else {
    const rating = await db.rating.findUnique({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      select: { id: true },
    });
    if (rating) {
      return { ok: false, error: "Retirez votre note pour marquer comme non vu." };
    }

    await db.seenMedia.deleteMany({
      where: { userId: user.id, mediaItemId },
    });
  }

  const [seen, rating] = await Promise.all([
    db.seenMedia.findUnique({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      select: { id: true },
    }),
    db.rating.findUnique({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      select: { id: true },
    }),
  ]);

  await pushToJellyfin(user.id, mediaItemId, { played: input.watched });

  refreshFeeds();
  return { ok: true, data: { watched: Boolean(seen || rating) } };
}

/** Toggle an episode's watched state (one-tap from the season page). */
export async function setEpisodeWatchedAction(input: {
  ref: unknown;
  watched: boolean;
}): Promise<ActionResult<{ watched: boolean }>> {
  return setMediaWatchedAction(input);
}

/** Like / unlike a media item (personal favourites). Returns the new state. */
export async function toggleMediaLikeAction(
  ref: unknown,
): Promise<ActionResult<{ liked: boolean }>> {
  const user = await requireUser();
  const parsed = mediaRefSchema.safeParse(ref);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const mediaItemId = await resolveMediaRef(parsed.data);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  const existing = await db.like.findUnique({
    where: { userId_targetType_targetId: { userId: user.id, targetType: "MEDIA", targetId: mediaItemId } },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    await db.activity.deleteMany({
      where: { actorId: user.id, type: "LIKED_MEDIA", targetType: "MEDIA", targetId: mediaItemId },
    });
  } else {
    await db.like.create({ data: { userId: user.id, targetType: "MEDIA", targetId: mediaItemId } });
    await recordActivity({
      actorId: user.id,
      type: "LIKED_MEDIA",
      mediaItemId,
      targetType: "MEDIA",
      targetId: mediaItemId,
    });
  }
  await pushToJellyfin(user.id, mediaItemId, { favorite: !existing });
  revalidatePath("/home");
  return { ok: true, data: { liked: !existing } };
}

/** Delete a review (avis) — author only. The linked diary entry is kept (its
 * reviewId is set null automatically). */
export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const review = await db.review.findUnique({ where: { id }, select: { userId: true } });
  if (!review || review.userId !== user.id) return { ok: false, error: "Introuvable." };

  await db.review.delete({ where: { id } });
  await db.activity.deleteMany({ where: { actorId: user.id, targetType: "REVIEW", targetId: id } });
  await db.like.deleteMany({ where: { targetType: "REVIEW", targetId: id } });
  refreshFeeds();
  return { ok: true };
}

/** Delete a diary entry (and its generated activity). */
export async function deleteWatchEntryAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await db.watchEntry.findUnique({ where: { id }, select: { userId: true } });
  if (!entry || entry.userId !== user.id) return { ok: false, error: "Introuvable." };
  await db.watchEntry.delete({ where: { id } });
  await db.activity.deleteMany({
    where: { actorId: user.id, targetType: "WATCH_ENTRY", targetId: id },
  });
  refreshFeeds();
  return { ok: true };
}
