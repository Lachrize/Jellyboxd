"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { connectJellyfin, disconnectJellyfin } from "@/lib/jellyfin/connection";
import { regenerateSyncToken } from "@/lib/jellyfin/sync-token";

export type ConnectState = { error?: string; success?: boolean; serverName?: string } | null;

const connectSchema = z.object({
  baseUrl: z.string().trim().url("URL invalide (ex. http://localhost:8096)"),
  username: z.string().trim().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function connectJellyfinAction(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const user = await requireUser();
  const parsed = connectSchema.safeParse({
    baseUrl: formData.get("baseUrl"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const res = await connectJellyfin(user.id, parsed.data.baseUrl, parsed.data.username, parsed.data.password);
  if (!res.ok) return { error: res.error };

  revalidatePath("/parametres");
  return { success: true, serverName: res.serverName };
}

export async function disconnectJellyfinAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await disconnectJellyfin(user.id);
  revalidatePath("/parametres");
  return { ok: true };
}

export async function regenerateSyncTokenAction(): Promise<{ ok: true; token: string }> {
  const user = await requireUser();
  const token = await regenerateSyncToken(user.id);
  revalidatePath("/parametres");
  return { ok: true, token };
}
