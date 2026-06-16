import { NextResponse } from "next/server";
import { isServerAuthorized } from "@/lib/sync/auth";
import { getSyncedRatedItems } from "@/lib/sync/pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Jellyfin items Jellyboxd has rated, as (jellyfinUserId, jellyfinItemId)
 * pairs. The plugin calls this from OnUninstalling() to remove exactly the
 * ratings it pushed into Jellyfin when the user uninstalls it.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!isServerAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = await getSyncedRatedItems();
  return NextResponse.json({ items });
}
