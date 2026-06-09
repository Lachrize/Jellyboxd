"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { regenerateSyncToken } from "@/lib/jellyfin/sync-token";

/** Generate (or rotate) the personal sync token pasted into the Jellyfin plugin. */
export async function regenerateSyncTokenAction(): Promise<{ ok: true; token: string }> {
  const user = await requireUser();
  const token = await regenerateSyncToken(user.id);
  revalidatePath("/parametres");
  return { ok: true, token };
}
