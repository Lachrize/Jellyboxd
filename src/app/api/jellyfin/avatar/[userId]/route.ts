import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPrimaryJellyfinServer } from "@/lib/jellyfin/config";
import { assertSafeJellyfinUrl } from "@/lib/security/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Jellyfin user ids are GUIDs (32 hex chars, optionally dashed). */
const JELLYFIN_ID = /^[a-f0-9-]{32,36}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  // Require a session: avatars are only meaningful to signed-in users, and an
  // open proxy lets anonymous visitors enumerate every Jellyfin user's image.
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (!JELLYFIN_ID.test(userId)) {
    return NextResponse.json({ error: "invalid_user_id" }, { status: 400 });
  }

  const server = await getPrimaryJellyfinServer();
  if (!server) return NextResponse.json({ error: "jellyfin_not_configured" }, { status: 404 });

  const baseUrl = server.baseUrl.replace(/\/+$/, "");
  try {
    await assertSafeJellyfinUrl(baseUrl);
  } catch {
    return NextResponse.json({ error: "jellyfin_not_configured" }, { status: 404 });
  }

  const response = await fetch(`${baseUrl}/Users/${encodeURIComponent(userId)}/Images/Primary`, {
    headers: { "X-Emby-Token": server.apiKey },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "avatar_not_found" }, { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
