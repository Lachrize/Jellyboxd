import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserBySyncToken } from "@/lib/jellyfin/sync-token";
import { bootstrapJellyfinAccount, linkExistingAccount } from "@/lib/jellyfin/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  serverId: z.string().min(1),
  serverName: z.string().optional().nullable(),
  jellyfinUserId: z.string().min(1),
  username: z.string().min(1),
});

/**
 * Called by the Jellyfin plugin to link/pair an account.
 * - With a valid token  -> link the Jellyfin identity to that existing account.
 * - Without            -> find-or-create the account, return a sync token (for
 *                          the plugin) + a one-time claim URL (to log into the
 *                          website without a password).
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const claimUrl = (code: string) => `${appUrl}/claim?code=${encodeURIComponent(code)}`;

  const owner = await resolveUserBySyncToken(request.headers.get("authorization"));
  if (owner) {
    const code = await linkExistingAccount(owner.userId, parsed.data);
    return NextResponse.json({ ok: true, mode: "linked", claimUrl: claimUrl(code) });
  }

  const res = await bootstrapJellyfinAccount(parsed.data);
  if (res.mode === "already_linked") {
    return NextResponse.json({ ok: true, mode: "already_linked" });
  }

  return NextResponse.json({ ok: true, mode: "bootstrap", token: res.token, claimUrl: claimUrl(res.claimCode) });
}
