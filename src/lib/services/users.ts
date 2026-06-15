import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { getOrCreateWatchlist } from "@/lib/services/lists";

/** Shared account creation (every account originates from Jellyfin). */
export async function createLocalUser(data: {
  username: string;
  name?: string | null;
  passwordHash: string;
  jellyfinUserId?: string | null;
}) {
  const user = await db.user.create({
    data: {
      username: data.username,
      name: data.name ?? null,
      passwordHash: data.passwordHash,
      jellyfinUserId: data.jellyfinUserId ?? null,
    },
  });
  await getOrCreateWatchlist(user.id);
  return user;
}

/** Turn an arbitrary Jellyfin display name into a valid Jellyboxd username. */
export function sanitizeUsername(raw: string): string {
  let u = raw
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (u.length < 3) u = `jf_${u}`.replace(/_+$/g, "");
  if (u.length < 3) u = "jfuser";
  return u.slice(0, 24);
}

export async function uniqueUsername(rawName: string): Promise<string> {
  const root = sanitizeUsername(rawName);
  if (!(await db.user.findUnique({ where: { username: root }, select: { id: true } }))) return root;
  for (let n = 2; n < 10_000; n++) {
    const suffix = String(n);
    const candidate = `${root.slice(0, 24 - suffix.length)}${suffix}`;
    if (!(await db.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
  }
  return `${root.slice(0, 16)}${Date.now().toString().slice(-6)}`;
}

/** An unguessable hash so SSO-created accounts have no usable local password. */
export function randomPasswordHash(): Promise<string> {
  return hashPassword(randomBytes(24).toString("base64url"));
}
