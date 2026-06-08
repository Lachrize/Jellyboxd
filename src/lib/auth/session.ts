import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_DURATION_DAYS } from "@/lib/constants";

const COOKIE_NAME = process.env.SESSION_COOKIE || "jellyboxd_session";
const DAY_MS = 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** We store only a hash of the token; the raw token lives in the httpOnly cookie. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

/** Create a DB-backed session and set the httpOnly cookie. */
export async function createSession(userId: string, meta: SessionMeta = {}): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * DAY_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent ?? undefined,
      ip: meta.ip ?? undefined,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Validate the cookie session and return the authenticated user (or null). */
export async function validateSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { session, user: session.user };
}

/** Destroy the current session (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
