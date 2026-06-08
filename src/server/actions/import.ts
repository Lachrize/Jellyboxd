"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionResult } from "./tracking";

export type ImportFormState = { error?: string; fieldErrors?: Record<string, string>; success?: boolean } | null;

const sourceSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  baseUrl: z.string().trim().url("URL invalide (ex. https://jellyfin.local)"),
});

/**
 * Registers an external library source (a Jellyfin server today). The row is the
 * anchor of the future sync: once connected, a worker maps its library into
 * MediaItem/ExternalMapping and its watch state into WatchEntry.
 */
export async function addImportSourceAction(_prev: ImportFormState, formData: FormData): Promise<ImportFormState> {
  const user = await requireUser();
  const parsed = sourceSchema.safeParse({ name: formData.get("name"), baseUrl: formData.get("baseUrl") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    return { fieldErrors };
  }

  await db.importSource.create({
    data: {
      userId: user.id,
      kind: "JELLYFIN",
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      status: "DISCONNECTED",
      config: JSON.stringify({ libraries: [] }),
    },
  });
  revalidatePath("/import");
  return { success: true };
}

export async function deleteImportSourceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const source = await db.importSource.findUnique({ where: { id }, select: { userId: true } });
  if (!source || source.userId !== user.id) return { ok: false, error: "Introuvable." };
  await db.importSource.delete({ where: { id } });
  revalidatePath("/import");
  return { ok: true };
}
