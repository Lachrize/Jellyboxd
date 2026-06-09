"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { createSession } from "@/lib/auth/session";
import { JellyfinApiError, JellyfinClient, normalizeJellyfinUrl } from "@/lib/jellyfin/client";
import { buildConfig, getJellyfinConnectionPreview } from "@/lib/jellyfin/config";
import { syncFromJellyfin } from "@/lib/jellyfin/sync";
import { provisionJellyfinUser, provisionJellyfinUsers } from "@/lib/jellyfin/users";

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

const setupSchema = testSchema;

export type JellyfinFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  users?: { id: string; name: string; isAdmin: boolean }[];
  serverName?: string;
  importedUsers?: { total: number; created: number; admins: number };
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

async function sessionMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") };
}

async function resolveApiKey(userId: string | null, raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (trimmed) return trimmed;
  if (!userId) return "";
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
  const user = await getCurrentUser();
  const apiKey = await resolveApiKey(user?.id ?? null, String(formData.get("apiKey") ?? ""));
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
      users: users
        .filter((u) => !u.Policy?.IsDisabled)
        .map((u) => ({ id: u.Id, name: u.Name, isAdmin: Boolean(u.Policy?.IsAdministrator) })),
    };
  } catch (error) {
    return { error: jellyfinErrorMessage(error) };
  }
}

/**
 * First-run setup: register the Jellyfin server and import every user, WITHOUT
 * logging anyone in. Each person then signs in with their own Jellyfin account.
 */
export async function setupJellyfinServerAction(_prev: JellyfinFormState, formData: FormData): Promise<JellyfinFormState> {
  const parsed = setupSchema.safeParse({
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
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
    const context = {
      baseUrl,
      apiKey: parsed.data.apiKey,
      serverId: info.Id,
      serverName: info.ServerName || "Jellyfin",
    };
    const importedUsers = await provisionJellyfinUsers(users, context);

    revalidatePath("/");
    revalidatePath("/login");
    return { success: true, serverName: info.ServerName, importedUsers };
  } catch (error) {
    return { error: jellyfinErrorMessage(error) };
  }
}

/** Save Jellyfin URL + API key + linked user. */
export async function connectJellyfinAction(_prev: JellyfinFormState, formData: FormData): Promise<JellyfinFormState> {
  const currentUser = await getCurrentUser();
  const existingForCurrentUser = currentUser
    ? await db.importSource.findFirst({
        where: { userId: currentUser.id, kind: "JELLYFIN" },
        select: { id: true, config: true },
      })
    : null;
  const apiKey = await resolveApiKey(currentUser?.id ?? null, String(formData.get("apiKey") ?? ""));

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

    let userId = currentUser?.id ?? null;
    let existing = existingForCurrentUser;
    const context = { baseUrl, apiKey: parsed.data.apiKey, serverId: info.Id, serverName: name };

    if (!userId) {
      const provisioned = await provisionJellyfinUser(jellyfinUser, context);
      userId = provisioned.userId;
      await createSession(userId, await sessionMeta());
      existing = await db.importSource.findFirst({
        where: { userId, kind: "JELLYFIN" },
        select: { id: true, config: true },
      });
    }

    if (!userId) return { error: "Impossible de créer la session Jellyboxd." };

    const importedUsers = await provisionJellyfinUsers(users, context);
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
        data: { userId, kind: "JELLYFIN", name, baseUrl, config, status: "CONNECTED" },
      });
    }

    await db.user.update({
      where: { id: userId },
      data: { jellyfinUserId: jellyfinUser.Id, jellyfinServerId: info.Id },
    });

    revalidatePath("/");
    revalidatePath("/home");
    revalidatePath("/parametres");
    revalidatePath("/import");
    return { success: true, serverName: info.ServerName, importedUsers };
  } catch (error) {
    return { error: jellyfinErrorMessage(error) };
  }
}

/** Save Jellyfin URL + API key + linked user for authenticated settings updates. */
export async function connectAuthenticatedJellyfinAction(
  _prev: JellyfinFormState,
  formData: FormData,
): Promise<JellyfinFormState> {
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
    const context = { baseUrl, apiKey: parsed.data.apiKey, serverId: info.Id, serverName: name };
    const importedUsers = await provisionJellyfinUsers(users, context);
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
    return { success: true, serverName: info.ServerName, importedUsers };
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
