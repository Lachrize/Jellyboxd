"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/current-user";
import { authenticateJellyfinUser, JellyfinApiError, JellyfinClient } from "@/lib/jellyfin/client";
import { getJellyfinConnection, getPrimaryJellyfinServer } from "@/lib/jellyfin/config";
import { fetchImageBytes, pushAvatarToJellyfin } from "@/lib/jellyfin/avatar";
import { SsrfError } from "@/lib/security/ssrf";
import { provisionJellyfinUser } from "@/lib/jellyfin/users";
import { rateLimit, rateLimitReset } from "@/lib/security/rate-limit";
import { loginSchema, profileSchema } from "@/lib/validation/auth";
import { z } from "zod";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function sessionMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") };
}

/** Best-effort client IP for rate-limiting (first hop of x-forwarded-for). */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "local").toLowerCase();
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { identifier, password } = parsed.data;
  const next = (formData.get("next") as string) || "/home";

  // Throttle brute-force by IP and by (IP, identifier). This also caps how fast
  // failed logins are forwarded to the upstream Jellyfin server.
  const ip = await clientIp();
  const idKey = `login:${ip}:${identifier.toLowerCase()}`;
  if (!rateLimit(idKey, 5, 60 * 1000).allowed || !rateLimit(`login:${ip}`, 20, 60 * 1000).allowed) {
    return { error: "Trop de tentatives. Réessayez dans une minute." };
  }

  try {
    // The only way into Jellyboxd is a Jellyfin account: authenticate the
    // username/password against the primary Jellyfin server, provisioning the
    // local account on first sign-in.
    const jellyfinUserId = await loginWithJellyfin(identifier, password);
    if (!jellyfinUserId) return { error: "Identifiants Jellyfin incorrects." };
    rateLimitReset(idKey);
    await createSession(jellyfinUserId, await sessionMeta());
  } catch (error) {
    // Surface the real cause in the server logs — most failures here are the
    // Jellyfin server being unreachable (e.g. a stale/LAN baseUrl from inside
    // Docker), which is otherwise invisible behind the generic message.
    console.error("[login] Jellyfin auth failed:", error);
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect(next.startsWith("/") ? next : "/home");
}

async function loginWithJellyfin(identifier: string, password: string): Promise<string | null> {
  const server = await getPrimaryJellyfinServer();
  if (!server) return null;

  let auth: Awaited<ReturnType<typeof authenticateJellyfinUser>>;
  try {
    auth = await authenticateJellyfinUser(server.baseUrl, identifier, password);
  } catch (error) {
    if (error instanceof JellyfinApiError && (error.status === 400 || error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }

  const fullUser = auth.User.Policy
    ? auth.User
    : (await new JellyfinClient(server.baseUrl, server.apiKey).getUsers()).find((user) => user.Id === auth.User.Id) ?? auth.User;

  const provisioned = await provisionJellyfinUser(fullUser, {
    baseUrl: server.baseUrl,
    apiKey: server.apiKey,
    serverId: server.serverId,
    serverName: server.name,
  });
  return provisioned.userId;
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name") || "",
    bio: formData.get("bio") || "",
    avatarUrl: formData.get("avatarUrl") || "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // When the account is linked to Jellyfin, the avatar lives on Jellyfin so the
  // change round-trips both ways: an uploaded file or a URL is pushed there,
  // and the stored value becomes the proxy URL that mirrors Jellyfin live.
  const linked = await getJellyfinConnection(user.id);
  const file = formData.get("avatarFile");
  const hasFile = file instanceof File && file.size > 0;
  const urlValue = parsed.data.avatarUrl || "";

  let avatarUrl: string | null;
  try {
    if (hasFile) {
      if (!file.type.startsWith("image/")) return { fieldErrors: { avatarFile: "Fichier image attendu." } };
      if (file.size > MAX_AVATAR_BYTES) return { fieldErrors: { avatarFile: "Image trop lourde (8 Mo max)." } };
      if (!linked) return { fieldErrors: { avatarFile: "Connectez Jellyfin pour téléverser une image." } };
      avatarUrl = await pushAvatarToJellyfin(user.id, Buffer.from(await file.arrayBuffer()), file.type);
    } else if (urlValue) {
      if (linked) {
        const { bytes, contentType } = await fetchImageBytes(urlValue);
        avatarUrl = await pushAvatarToJellyfin(user.id, bytes, contentType);
      } else {
        avatarUrl = urlValue;
      }
    } else if (linked) {
      // No new image supplied: keep the current Jellyfin-mirrored avatar so a
      // simple name/bio edit doesn't wipe the photo on Jellyfin.
      avatarUrl = user.avatarUrl ?? null;
    } else {
      avatarUrl = null;
    }
  } catch (error) {
    const message =
      error instanceof SsrfError || error instanceof Error
        ? error.message
        : "Impossible de mettre à jour l'avatar.";
    return { fieldErrors: { [hasFile ? "avatarFile" : "avatarUrl"]: message } };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name || null,
      bio: parsed.data.bio || null,
      avatarUrl,
    },
  });
  revalidatePath("/parametres");
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/home");
  return { success: true };
}
