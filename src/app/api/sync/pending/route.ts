import { NextResponse } from "next/server";
import { z } from "zod";
import { isServerAuthorized } from "@/lib/sync/auth";
import { ackPendingChanges, getPendingChanges } from "@/lib/sync/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Outbound queue: every user's Jellyboxd changes for the plugin to apply to Jellyfin. */
export async function GET(req: Request): Promise<NextResponse> {
  if (!isServerAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const changes = await getPendingChanges();
  return NextResponse.json({ changes });
}

const ackSchema = z.object({
  acks: z.array(z.object({ id: z.string().min(1), updatedAt: z.string().min(1) })).default([]),
});

/** Ack: drop changes the plugin has applied (unless re-edited since the pull). */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isServerAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const removed = await ackPendingChanges(parsed.data.acks);
  return NextResponse.json({ ok: true, removed });
}
