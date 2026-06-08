"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionResult } from "./tracking";

async function revalidateFor(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (u) revalidatePath(`/u/${u.username}`);
  revalidatePath("/home");
}

/** Send a friend request (auto-accepts if the other already invited you). */
export async function sendFriendRequestAction(targetUserId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (targetUserId === user.id) return { ok: false, error: "Vous ne pouvez pas vous ajouter." };

  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return { ok: false, error: "Utilisateur introuvable." };

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "PENDING" && existing.addresseeId === user.id) {
      // They already invited us -> accept.
      await db.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
    }
    // else: already friends or request already sent — no-op.
  } else {
    await db.friendship.create({
      data: { requesterId: user.id, addresseeId: targetUserId, status: "PENDING" },
    });
  }

  await Promise.all([revalidateFor(targetUserId), revalidateFor(user.id)]);
  return { ok: true };
}

/** Accept or decline an incoming request from `requesterId`. */
export async function respondFriendRequestAction(
  requesterId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const request = await db.friendship.findFirst({
    where: { requesterId, addresseeId: user.id, status: "PENDING" },
  });
  if (!request) return { ok: false, error: "Demande introuvable." };

  if (accept) {
    await db.friendship.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
  } else {
    await db.friendship.delete({ where: { id: request.id } });
  }

  await Promise.all([revalidateFor(requesterId), revalidateFor(user.id)]);
  return { ok: true };
}

/** Remove an existing friendship. */
export async function removeFriendAction(otherUserId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.friendship.deleteMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: user.id, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: user.id },
      ],
    },
  });
  await Promise.all([revalidateFor(otherUserId), revalidateFor(user.id)]);
  return { ok: true };
}

/** Cancel a pending request you sent. */
export async function cancelFriendRequestAction(otherUserId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.friendship.deleteMany({
    where: { requesterId: user.id, addresseeId: otherUserId, status: "PENDING" },
  });
  await Promise.all([revalidateFor(otherUserId), revalidateFor(user.id)]);
  return { ok: true };
}
