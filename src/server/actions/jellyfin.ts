"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { JellyfinApiError, JellyfinClient, normalizeJellyfinUrl } from "@/lib/jellyfin/client";
import { buildConfig, getJellyfinConnectionPreview } from "@/lib/jellyfin/config";
import { syncFromJellyfin } from "@/lib/jellyfin/sync";

const connectSchema = z.object({
  baseUrl: z.string().trim().min(1, "URL requise"),
  apiKey: z.string().trim().min(1, "Clé API requise"),
  jellyfinUserId: z.string().trim().min(1, "Utilisateur Jellyfin requis"),
  name: z.string().trim().max(60).optional(),
});

const testSchema = z.object({
  baseUrl: z.string().trim().min(1, "URL requise"),
  apiKey: z.string().trim().min(1, "Clé API requise"),
});

export type JellyfinFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  users?: { id: string; name: string }[];
  serverName?: string;
  syncResult?: { processed: number; applied: number; skipped: number; unmatched: number };
} | null;

function jellyfinErrorMessage(error: unknown): string {
  if (error instanceof JellyfinApiError) {
    if (error.status === 401) return "Clé API invalide.";
    if (error.status === 404) return "Serveur Jellyfin introuvable à cette adresse.";
    return `Jellyfin a répondu ${error.status}.`;
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Délai dépassé — vérifiez que Jellyboxd est sur le même réseau que Jellyfin.";
  }
  if (error instanceof TypeError) {
    return "Impossible de joindre le serveur — vérifiez l'URL et le réseau.";
  }
  return "Connexion impossible.";
}

async function resolveApiKey(userId: string, raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (trimmed) return trimmed;
  const existing = await db.importSource.findFirst({
    where: { userId, kind: "JELLYFIN" },
    select: { config: true },
  });
  if (!existing?.config) return "";
  try {
    const { decryptSecret } = await import("@/lib/jellyfin/secrets");
    const cfg = JSON.parse(existing.config) as { apiKeyEnc?: string };
    return cfg.apiKeyEnc ? decryptSecret(cfg.apiKeyEnc) : "";
  } catch {
    return "";
  }
}

/** Probe Jellyfin and return the list of users (for the picker). */
export async function testJellyfinConnectionAction(_prev: JellyfinFormState, formData: FormData): Promise<JellyfinFormState> {
  const user = await requireUser();
  const apiKey = await resolveApiKey(user.id, String(formData.get("apiKey") ?? ""));
  const parsed = testSchema.safeParse({
    baseUrl: formData.get("baseUrl"),
    apiKey,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    return { fieldErrors };
  }

  try {
    const baseUrl = normalizeJellyfinUrl(parsed.data.baseUrl);
    const client = new JellyfinClient(baseUrl, parsed.data.apiKey);
    const [info, users] = await Promise.all([client.getSystemInfo(), client.getUsers()]);
    return {
      success: true,
      serverName: info.ServerName,
      users: users.map((u) => ({ id: u.Id, name: u.Name })),
    };
  } catch (error) {
    return { error: jellyfinErrorMessage(error) };
  }
}

/** Save Jellyfin URL + API key + linked user. */
export async function connectJellyfinAction(_prev: JellyfinFormState, formData: FormData): Promise<JellyfinFormState> {
  const user = await requireUser();
  const existing = await db.importSource.findFirst({
    where: { userId: user.id, kind: "JELLYFIN" },
    select: { id: true, config: true },
  });
  const apiKey = await resolveApiKey(user.id, String(formData.get("apiKey") ?? ""));

  const parsed = connectSchema.safeParse({
    baseUrl: formData.get("baseUrl"),
    apiKey,
    jellyfinUserId: formData.get("jellyfinUserId"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    return { fieldErrors };
  }

  try {
    const baseUrl = normalizeJellyfinUrl(parsed.data.baseUrl);
    const client = new JellyfinClient(baseUrl, parsed.data.apiKey);
    const [info, users] = await Promise.all([client.getSystemInfo(), client.getUsers()]);
    const jellyfinUser = users.find((u) => u.Id === parsed.data.jellyfinUserId);
    if (!jellyfinUser) return { error: "Utilisateur Jellyfin introuvable." };

    const name = parsed.data.name?.trim() || info.ServerName || "Jellyfin";
    const config = buildConfig({
      apiKey: parsed.data.apiKey,
      jellyfinUserId: jellyfinUser.Id,
      jellyfinUserName: jellyfinUser.Name,
      serverId: info.Id,
    });

    if (existing) {
      await db.importSource.update({
        where: { id: existing.id },
        data: { name, baseUrl, config, status: "CONNECTED" },
      });
    } else {
      await db.importSource.create({
        data: { userId: user.id, kind: "JELLYFIN", name, baseUrl, config, status: "CONNECTED" },
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { jellyfinUserId: jellyfinUser.Id, jellyfinServerId: info.Id },
    });

    revalidatePath("/parametres");
    revalidatePath("/import");
    return { success: true, serverName: info.ServerName };
  } catch (error) {
    return { error: jellyfinErrorMessage(error) };
  }
}

export async function disconnectJellyfinAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  await db.importSource.deleteMany({ where: { userId: user.id, kind: "JELLYFIN" } });
  await db.user.update({
    where: { id: user.id },
    data: { jellyfinUserId: null, jellyfinServerId: null },
  });
  revalidatePath("/parametres");
  revalidatePath("/import");
  return { ok: true };
}

export async function syncJellyfinAction(): Promise<JellyfinFormState> {
  const user = await requireUser();
  const preview = await getJellyfinConnectionPreview(user.id);
  if (!preview?.hasApiKey) return { error: "Connectez d'abord votre serveur Jellyfin." };

  const result = await syncFromJellyfin(user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath("/home");
  revalidatePath("/journal");
  revalidatePath("/parametres");
  revalidatePath("/import");
  return { success: true, syncResult: result };
}
