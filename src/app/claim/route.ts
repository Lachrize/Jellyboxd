import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consume a one-time claim link (`/claim?code=…`) minted by
 * /api/auth/jellyfin-link: log the user in (set the session cookie) and bounce
 * to the app. Lets a paired Jellyfin user open Jellyboxd without a password.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=claim", url.origin));

  const claim = await db.claimCode.findUnique({
    where: { code },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!claim || claim.usedAt || claim.expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?error=claim", url.origin));
  }

  await db.claimCode.update({ where: { id: claim.id }, data: { usedAt: new Date() } });
  await createSession(claim.userId, { userAgent: req.headers.get("user-agent") });

  return NextResponse.redirect(new URL("/home", url.origin));
}
