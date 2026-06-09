import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { consumeClaimCode } from "@/lib/jellyfin/link";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link login from the Jellyfin plugin. Consumes a one-time claim code and
 * opens a Jellyboxd session — no password needed for Jellyfin users.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const userId = await consumeClaimCode(code);
    if (userId) {
      const h = await headers();
      await createSession(userId, { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") });
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=lien-invalide", request.url));
}
