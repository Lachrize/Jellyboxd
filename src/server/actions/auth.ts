"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateWatchlist } from "@/lib/services/lists";
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
    const user = await db.user.create({
      data: { email, username, name: name || null, passwordHash: await hashPassword(password) },
    });
    await getOrCreateWatchlist(user.id);
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
    if (!user || !ok) return { error: "Identifiants incorrects." };
    await createSession(user.id, await sessionMeta());
  } catch {
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect(next.startsWith("/") ? next : "/home");
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
