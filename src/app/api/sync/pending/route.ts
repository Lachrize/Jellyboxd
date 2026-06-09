import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUserBySyncToken } from "@/lib/jellyfin/sync-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tmdbOf = (mappings: { provider: string; externalId: string }[]) =>
  mappings.find((m) => m.provider === "TMDB")?.externalId ?? null;

/**
 * Outbound queue for a user's Jellyfin plugin (Jellyboxd -> Jellyfin).
 * GET  -> pending changes to apply locally.
 * POST -> ack applied changes ({ acks: [{ id, updatedAt }] }).
 * Auth: `Authorization: Bearer <personal sync token>`.
 */
export async function GET(request: Request) {
  const owner = await resolveUserBySyncToken(request.headers.get("authorization"));
  if (!owner) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const seriesSelect = {
    series: { select: { mediaItem: { select: { externalMappings: { select: { provider: true, externalId: true } } } } } },
  } as const;

  const rows = await db.pendingSync.findMany({
    where: { userId: owner.userId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      played: true,
      rating: true,
      favorite: true,
      updatedAt: true,
      mediaItem: {
        select: {
          kind: true,
          externalMappings: { select: { provider: true, externalId: true } },
          episode: { select: { seasonNumber: true, episodeNumber: true, ...seriesSelect } },
          season: { select: { seasonNumber: true, ...seriesSelect } },
        },
      },
    },
  });

  const changes = rows.map((r) => {
    const m = r.mediaItem;
    const seriesTmdb = m.episode
      ? tmdbOf(m.episode.series.mediaItem.externalMappings)
      : m.season
        ? tmdbOf(m.season.series.mediaItem.externalMappings)
        : null;
    return {
      id: r.id,
      updatedAt: r.updatedAt.toISOString(),
      kind: m.kind,
      tmdb: tmdbOf(m.externalMappings),
      seriesTmdb,
      seasonNumber: m.episode?.seasonNumber ?? m.season?.seasonNumber ?? null,
      episodeNumber: m.episode?.episodeNumber ?? null,
      played: r.played,
      rating: r.rating, // null = no change, 0 = clear, 1..10 = set
      favorite: r.favorite,
    };
  });

  return NextResponse.json({ ok: true, changes });
}

const ackSchema = z.object({
  acks: z.array(z.object({ id: z.string(), updatedAt: z.string() })).max(500),
});

export async function POST(request: Request) {
  const owner = await resolveUserBySyncToken(request.headers.get("authorization"));
  if (!owner) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = ackSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  let removed = 0;
  for (const a of parsed.data.acks) {
    // Only delete if not modified since the plugin pulled it (avoids losing a
    // change the user made in the meantime).
    const res = await db.pendingSync.deleteMany({
      where: { id: a.id, userId: owner.userId, updatedAt: { lte: new Date(a.updatedAt) } },
    });
    removed += res.count;
  }
  return NextResponse.json({ ok: true, removed });
}
