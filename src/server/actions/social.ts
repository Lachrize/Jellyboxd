"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { recordActivity } from "@/lib/services/activity";
import { visibleVisibilitiesFor } from "@/lib/services/friends";
import { LIKE_TARGETS } from "@/lib/constants";
import { commentSchema } from "@/lib/validation/lists";
import type { ActionResult } from "./tracking";

export async function toggleFollowAction(
  targetUserId: string,
): Promise<ActionResult<{ following: boolean }>> {
  const user = await requireUser();
  if (targetUserId === user.id) return { ok: false, error: "Vous ne pouvez pas vous suivre." };

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
  } else {
    await db.follow.create({ data: { followerId: user.id, followingId: targetUserId } });
    await recordActivity({ actorId: user.id, type: "FOLLOWED", targetType: "USER", targetId: targetUserId });
  }

  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { username: true } });
  if (target) revalidatePath(`/u/${target.username}`);
  revalidatePath("/home");
  return { ok: true, data: { following: !existing } };
}

const likeInput = z.object({
  targetType: z.enum(LIKE_TARGETS),
  targetId: z.string().min(1),
});

export async function toggleLikeAction(input: unknown): Promise<ActionResult<{ liked: boolean }>> {
  const user = await requireUser();
  const parsed = likeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const { targetType, targetId } = parsed.data;
  const existing = await db.like.findUnique({
    where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
  } else {
    await db.like.create({ data: { userId: user.id, targetType, targetId } });
    if (targetType === "REVIEW") {
      const review = await db.review.findUnique({ where: { id: targetId }, select: { mediaItemId: true } });
      await recordActivity({
        actorId: user.id,
        type: "LIKED_REVIEW",
        mediaItemId: review?.mediaItemId,
        targetType,
        targetId,
      });
    }
  }
  revalidatePath("/home");
  return { ok: true, data: { liked: !existing } };
}

/** Whether `viewerId` is allowed to see (and therefore comment on) a target. */
async function canViewCommentTarget(
  viewerId: string,
  targetType: "REVIEW" | "WATCH_ENTRY" | "LIST",
  targetId: string,
): Promise<boolean> {
  if (targetType === "LIST") {
    const list = await db.list.findUnique({ where: { id: targetId }, select: { userId: true, isPublic: true } });
    if (!list) return false;
    return list.userId === viewerId || list.isPublic;
  }

  const owner =
    targetType === "REVIEW"
      ? await db.review.findUnique({ where: { id: targetId }, select: { userId: true, visibility: true } })
      : await db.watchEntry.findUnique({ where: { id: targetId }, select: { userId: true, visibility: true } });
  if (!owner) return false;
  if (owner.userId === viewerId) return true;
  const allowed = await visibleVisibilitiesFor(owner.userId, viewerId);
  return allowed === null || allowed.includes(owner.visibility);
}

export async function addCommentAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Commentaire invalide." };

  // Don't let a comment be attached to a target the user can't see (or that
  // doesn't exist) — otherwise comments could be planted on arbitrary ids.
  if (!(await canViewCommentTarget(user.id, parsed.data.targetType, parsed.data.targetId))) {
    return { ok: false, error: "Cible introuvable." };
  }

  await db.comment.create({
    data: {
      userId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      body: parsed.data.body,
      parentId: parsed.data.parentId,
    },
  });
  revalidatePath("/home");
  return { ok: true };
}
