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
  // Behind a reverse proxy, request.url uses the internal host (0.0.0.0). Use the
  // configured public URL for redirects so the browser lands on the real domain.
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const userId = await consumeClaimCode(code);
    if (userId) {
      const h = await headers();
      await createSession(userId, { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") });
      return NextResponse.redirect(`${base}/home`);
    }
  }
  return NextResponse.redirect(`${base}/login?error=lien-invalide`);
}
