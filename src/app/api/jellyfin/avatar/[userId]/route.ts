import { NextResponse } from "next/server";
import { getPrimaryJellyfinServer } from "@/lib/jellyfin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const server = await getPrimaryJellyfinServer();
  if (!server) return NextResponse.json({ error: "jellyfin_not_configured" }, { status: 404 });

  const baseUrl = server.baseUrl.replace(/\/+$/, "");
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
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
