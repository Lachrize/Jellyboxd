"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/current-user";
import type { ActionResult } from "./tracking";

/** Grant or revoke admin rights. You cannot demote yourself (avoids lockout). */
export async function setUserAdminAction(userId: string, makeAdmin: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && !makeAdmin) {
    return { ok: false, error: "Vous ne pouvez pas retirer vos propres droits admin." };
  }
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };

  await db.user.update({ where: { id: userId }, data: { isAdmin: makeAdmin } });
  revalidatePath("/admin");
  return { ok: true };
}

/** Permanently delete a user and all their data (cascades). Not yourself. */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte ici." };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return { ok: true };
}

/** Moderation: delete any user's review. */
export async function deleteReviewAdminAction(reviewId: string): Promise<ActionResult> {
  await requireAdmin();
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) return { ok: false, error: "Critique introuvable." };

  await db.review.delete({ where: { id: reviewId } });
  await db.like.deleteMany({ where: { targetType: "REVIEW", targetId: reviewId } });
  await db.activity.deleteMany({ where: { targetType: "REVIEW", targetId: reviewId } });
  revalidatePath("/admin");
  return { ok: true };
}

/** Moderation: delete any comment. */
export async function deleteCommentAdminAction(commentId: string): Promise<ActionResult> {
  await requireAdmin();
  const comment = await db.comment.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!comment) return { ok: false, error: "Commentaire introuvable." };

  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/admin");
  return { ok: true };
}
