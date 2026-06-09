import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUserBySyncToken } from "@/lib/jellyfin/sync-token";
import { applyInboundEvent, type InboundSyncEvent } from "@/lib/jellyfin/inbound";

/** Writes via Prisma — force the Node.js runtime. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CORS so the plugin's in-browser "Test connection" button can probe GET. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const providerIdsSchema = z
  .object({
    Tmdb: z.string().nullable().optional(),
    Imdb: z.string().nullable().optional(),
    Tvdb: z.string().nullable().optional(),
  })
  .optional()
  .nullable();

const bodySchema = z.object({
  user: z.object({
    name: z.string().optional().nullable(),
    jellyfinUserId: z.string().optional().nullable(),
  }),
  item: z.object({
    jellyfinItemId: z.string().min(1),
    type: z.string().min(1),
    name: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    providerIds: providerIdsSchema,
    seriesProviderIds: providerIdsSchema,
    seasonNumber: z.number().int().optional().nullable(),
    episodeNumber: z.number().int().optional().nullable(),
  }),
  state: z.object({
    played: z.boolean(),
    isFavorite: z.boolean(),
    rating: z.number().nullable().optional(),
  }),
  timestamp: z.string().optional().nullable(),
});

/**
 * Inbound endpoint for a user's Jellyfin plugin (Jellyfin -> Jellyboxd).
 * Auth: `Authorization: Bearer <personal sync token>` -> identifies the user.
 * Events for other Jellyfin users on the same server are ignored.
 */
export async function POST(request: Request) {
  const owner = await resolveUserBySyncToken(request.headers.get("authorization"));
  if (!owner) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  // Only sync events for the token owner's own Jellyfin user. The owner's
  // jellyfinUserId is learned from the first event (no prior "connect" needed).
  const eventUser = parsed.data.user.jellyfinUserId;
  if (owner.jellyfinUserId && eventUser && owner.jellyfinUserId !== eventUser) {
    return NextResponse.json({ ok: true, status: "ignored", reason: "other_user" });
  }
  if (!owner.jellyfinUserId && eventUser) {
    await db.user.update({ where: { id: owner.userId }, data: { jellyfinUserId: eventUser } }).catch(() => {});
  }

  const result = await applyInboundEvent(owner.userId, parsed.data as InboundSyncEvent);
  if (!result.ok) {
    return NextResponse.json({ ok: true, status: "ignored", reason: result.reason });
  }

  if (result.applied.length > 0) {
    revalidatePath("/home");
    revalidatePath("/journal");
    revalidatePath("/film/[id]", "page");
    revalidatePath("/serie/[id]", "page");
  }
  return NextResponse.json({ ok: true, status: "applied", applied: result.applied });
}

/** Health/auth probe for the plugin's "Test connection" button. */
export async function GET(request: Request) {
  const owner = await resolveUserBySyncToken(request.headers.get("authorization"));
  if (!owner) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }
  return NextResponse.json({ ok: true, service: "jellyboxd-sync", version: 2 }, { headers: CORS_HEADERS });
}
