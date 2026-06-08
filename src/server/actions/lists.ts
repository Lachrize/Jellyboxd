"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { resolveMediaRef } from "@/lib/media/upsert";
import { recordActivity } from "@/lib/services/activity";
import { uniqueListSlug } from "@/lib/services/lists";
import { addToListSchema, createListSchema } from "@/lib/validation/lists";
import { mediaRefSchema } from "@/lib/validation/media";
import { z } from "zod";
import type { ActionResult } from "./tracking";

export type ListFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createListAction(_prev: ListFormState, formData: FormData): Promise<ListFormState> {
  const user = await requireUser();
  const parsed = createListSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    isRanked: formData.get("isRanked") === "on",
    isPublic: formData.get("isPublic") !== "off",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    return { fieldErrors };
  }

  const slug = await uniqueListSlug(user.id, parsed.data.title);
  const list = await db.list.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      isRanked: parsed.data.isRanked,
      isPublic: parsed.data.isPublic,
      kind: "CUSTOM",
    },
  });
  await recordActivity({
    actorId: user.id,
    type: "LIST_CREATED",
    targetType: "LIST",
    targetId: list.id,
    data: { title: list.title },
  });
  revalidatePath("/listes");
  redirect(`/liste/${list.id}`);
}

export async function addToListAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addToListSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const list = await db.list.findUnique({ where: { id: parsed.data.listId }, select: { userId: true } });
  if (!list || list.userId !== user.id) return { ok: false, error: "Liste introuvable." };

  const mediaItemId = await resolveMediaRef(parsed.data.ref);
  if (!mediaItemId) return { ok: false, error: "Œuvre introuvable." };

  const count = await db.listItem.count({ where: { listId: parsed.data.listId } });
  await db.listItem.upsert({
    where: { listId_mediaItemId: { listId: parsed.data.listId, mediaItemId } },
    update: { note: parsed.data.note || null },
    create: { listId: parsed.data.listId, mediaItemId, note: parsed.data.note || null, position: count },
  });
  revalidatePath(`/liste/${parsed.data.listId}`);
  return { ok: true };
}

export async function removeFromListAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const schema = z.object({ listId: z.string().cuid(), mediaItemId: z.string().cuid() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const list = await db.list.findUnique({ where: { id: parsed.data.listId }, select: { userId: true } });
  if (!list || list.userId !== user.id) return { ok: false, error: "Liste introuvable." };

  await db.listItem.deleteMany({
    where: { listId: parsed.data.listId, mediaItemId: parsed.data.mediaItemId },
  });
  revalidatePath(`/liste/${parsed.data.listId}`);
  return { ok: true };
}

export async function deleteListAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const list = await db.list.findUnique({ where: { id }, select: { userId: true, kind: true } });
  if (!list || list.userId !== user.id) return { ok: false, error: "Liste introuvable." };
  if (list.kind === "WATCHLIST") return { ok: false, error: "La watchlist ne peut pas être supprimée." };
  await db.list.delete({ where: { id } });
  revalidatePath("/listes");
  return { ok: true };
}

/** Used by the "add to a list" picker on detail pages. */
export async function quickAddToListAction(input: {
  listId: string;
  ref: unknown;
}): Promise<ActionResult> {
  const refParsed = mediaRefSchema.safeParse(input.ref);
  if (!refParsed.success) return { ok: false, error: "Données invalides." };
  return addToListAction({ listId: input.listId, ref: refParsed.data });
}
