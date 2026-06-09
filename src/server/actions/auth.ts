"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/current-user";
import { authenticateJellyfinUser, JellyfinApiError, JellyfinClient } from "@/lib/jellyfin/client";
import { getPrimaryJellyfinServer } from "@/lib/jellyfin/config";
import { provisionJellyfinUser } from "@/lib/jellyfin/users";
import { createLocalUser } from "@/lib/services/users";
import { loginSchema, profileSchema, registerSchema } from "@/lib/validation/auth";
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

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    name: formData.get("name") || "",
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { email, username, name, password } = parsed.data;
  try {
    const existing = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      return {
        error: existing.email === email ? "Cet e-mail est déjà utilisé." : "Ce pseudo est déjà pris.",
      };
    }
    const user = await createLocalUser({ email, username, name: name || null, passwordHash: await hashPassword(password) });
    await createSession(user.id, await sessionMeta());
  } catch {
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect("/home");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { identifier, password } = parsed.data;
  const next = (formData.get("next") as string) || "/home";

  try {
    const user = await db.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
    });
    // Constant-ish work even on missing user to limit enumeration.
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (user && ok) {
      await createSession(user.id, await sessionMeta());
    } else {
      const jellyfinUserId = await loginWithJellyfin(identifier, password);
      if (!jellyfinUserId) return { error: "Identifiants Jellyfin incorrects." };
      await createSession(jellyfinUserId, await sessionMeta());
    }
  } catch {
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

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name") || "",
    bio: formData.get("bio") || "",
    avatarUrl: formData.get("avatarUrl") || "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name || null,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
  });
  revalidatePath("/parametres");
  revalidatePath(`/u/${user.username}`);
  return { success: true };
}

/**
 * Set a Jellyboxd e-mail and/or password from Settings. No current password is
 * required (the active session proves identity) — this lets Jellyfin-paired
 * accounts, which have a random password, choose real credentials so they can
 * log in normally without the plugin link.
 */
export async function updateCredentialsAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");

  const fieldErrors: Record<string, string> = {};
  let newEmail: string | undefined;
  let newHash: string | undefined;

  if (email) {
    if (!z.string().email().safeParse(email).success) {
      fieldErrors.email = "Adresse e-mail invalide";
    } else {
      const taken = await db.user.findFirst({ where: { email, NOT: { id: user.id } }, select: { id: true } });
      if (taken) fieldErrors.email = "Cet e-mail est déjà utilisé.";
      else newEmail = email;
    }
  }

  if (password || passwordConfirm) {
    if (password.length < 8) fieldErrors.password = "Au moins 8 caractères";
    else if (password !== passwordConfirm) fieldErrors.passwordConfirm = "Les mots de passe ne correspondent pas";
    else newHash = await hashPassword(password);
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!newEmail && !newHash) return { error: "Renseignez un e-mail ou un mot de passe." };

  await db.user.update({
    where: { id: user.id },
    data: { ...(newEmail ? { email: newEmail } : {}), ...(newHash ? { passwordHash: newHash } : {}) },
  });
  revalidatePath("/parametres");
  return { success: true };
}
