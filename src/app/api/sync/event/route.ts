import { NextResponse } from "next/server";
import { z } from "zod";
import { isServerAuthorized } from "@/lib/sync/auth";
import { resolveOrCreateJellyboxdUser } from "@/lib/sync/users";
import { applyInboundEvent, type InboundSyncEvent } from "@/lib/jellyfin/inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const providerIds = z
  .object({ Tmdb: z.string().nullish(), Imdb: z.string().nullish(), Tvdb: z.string().nullish() })
  .partial();

/** Drop null provider ids so the shape matches JellyfinProviderIds (string | undefined). */
function cleanIds(p: z.infer<typeof providerIds> | null | undefined) {
  if (!p) return null;
  return { Tmdb: p.Tmdb ?? undefined, Imdb: p.Imdb ?? undefined, Tvdb: p.Tvdb ?? undefined };
}

const payloadSchema = z.object({
  user: z.object({ name: z.string().nullish(), jellyfinUserId: z.string().min(1) }),
  item: z.object({
    jellyfinItemId: z.string().min(1),
    type: z.string().min(1),
    name: z.string().nullish(),
    year: z.number().int().nullish(),
    providerIds: providerIds.nullish(),
    seriesProviderIds: providerIds.nullish(),
    seasonNumber: z.number().int().nullish(),
    episodeNumber: z.number().int().nullish(),
  }),
  state: z.object({
    played: z.boolean(),
    isFavorite: z.boolean(),
    rating: z.number().nullish(),
  }),
  timestamp: z.string().nullish(),
});

/**
 * Inbound: the plugin pushes one Jellyfin user-data snapshot. Authenticated by
 * the shared server key; the target Jellyboxd account is resolved (or created)
 * from the payload's jellyfinUserId, so every Jellyfin user syncs.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isServerAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const user = await resolveOrCreateJellyboxdUser(parsed.data.user.jellyfinUserId, {
    username: parsed.data.user.name,
  });

  const event: InboundSyncEvent = {
    user: { name: parsed.data.user.name, jellyfinUserId: parsed.data.user.jellyfinUserId },
    item: {
      jellyfinItemId: parsed.data.item.jellyfinItemId,
      type: parsed.data.item.type,
      name: parsed.data.item.name,
      year: parsed.data.item.year ?? null,
      providerIds: cleanIds(parsed.data.item.providerIds),
      seriesProviderIds: cleanIds(parsed.data.item.seriesProviderIds),
      seasonNumber: parsed.data.item.seasonNumber ?? null,
      episodeNumber: parsed.data.item.episodeNumber ?? null,
    },
    state: {
      played: parsed.data.state.played,
      isFavorite: parsed.data.state.isFavorite,
      rating: parsed.data.state.rating ?? null,
    },
    timestamp: parsed.data.timestamp ?? null,
  };

  let result;
  try {
    result = await applyInboundEvent(user.id, event, { recordActivities: true });
  } catch (error) {
    console.error("[jellyboxd] inbound sync event failed:", error);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
  if (!result.ok) {
    // Unmatched/unsupported items are expected (item not in the local catalogue);
    // 200 so the plugin doesn't retry forever.
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  return NextResponse.json({ ok: true, applied: result.applied });
}
