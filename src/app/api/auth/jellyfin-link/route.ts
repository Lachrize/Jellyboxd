import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateCode, isServerAuthorized } from "@/lib/sync/auth";
import { resolveOrCreateJellyboxdUser } from "@/lib/sync/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAIM_TTL_MS = 15 * 60 * 1000;

const linkSchema = z.object({
  serverId: z.string().min(1),
  serverName: z.string().nullish(),
  jellyfinUserId: z.string().min(1),
  username: z.string().min(1),
});

function appBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return new URL(req.url).origin;
}

/**
 * Ensure a Jellyboxd account exists for a Jellyfin user and hand back a one-time
 * claim link (so they can open Jellyboxd logged in without a password).
 * Authenticated by the shared server key — no per-user token in the multi-user
 * model (users are routed by jellyfinUserId).
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isServerAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const user = await resolveOrCreateJellyboxdUser(parsed.data.jellyfinUserId, {
    username: parsed.data.username,
    serverId: parsed.data.serverId,
  });

  const code = generateCode();
  await db.claimCode.create({
    data: { code, userId: user.id, expiresAt: new Date(Date.now() + CLAIM_TTL_MS) },
  });

  return NextResponse.json({ mode: "linked", claimUrl: `${appBaseUrl(req)}/claim?code=${encodeURIComponent(code)}` });
}
