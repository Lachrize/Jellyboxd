import { assertSafeUrl } from "@/lib/security/ssrf";
import { getJellyfinConnection } from "./config";

/** Max avatar payload we'll accept/upload (Jellyfin re-encodes it anyway). */
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

/** Build the same-origin proxy path; the tag busts the HTTP cache on change. */
export function buildAvatarPath(jellyfinUserId: string, tag?: string | null): string {
  const base = `/api/jellyfin/avatar/${encodeURIComponent(jellyfinUserId)}`;
  return tag ? `${base}?tag=${encodeURIComponent(tag)}` : base;
}

/** The proxy URL reflecting a user's CURRENT Jellyfin avatar, or null if none. */
export function avatarPathFor(user: { Id: string; PrimaryImageTag?: string; HasPrimaryImage?: boolean }): string | null {
  if (!user.PrimaryImageTag && !user.HasPrimaryImage) return null;
  return buildAvatarPath(user.Id, user.PrimaryImageTag);
}

/**
 * Download an image from a user-supplied URL to push it to Jellyfin. Follows
 * redirects manually so every hop is SSRF-checked (no internal targets).
 */
export async function fetchImageBytes(rawUrl: string): Promise<{ bytes: Buffer; contentType: string }> {
  let current = rawUrl;
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop += 1) {
    await assertSafeUrl(current);
    res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current).toString();
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error("Image inaccessible à cette URL.");
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error("L'URL ne pointe pas vers une image.");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) throw new Error("Image vide.");
  if (bytes.length > MAX_AVATAR_BYTES) throw new Error("Image trop lourde (8 Mo max).");
  return { bytes, contentType };
}

/**
 * Upload an avatar to the user's linked Jellyfin account and return the fresh
 * proxy URL (with the new image tag). Returns null if the user isn't linked.
 */
export async function pushAvatarToJellyfin(
  userId: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  const conn = await getJellyfinConnection(userId);
  if (!conn) return null;
  await conn.client.uploadUserImage(conn.jellyfinUserId, contentType, bytes.toString("base64"));
  const updated = await conn.client.getUser(conn.jellyfinUserId).catch(() => null);
  // Fall back to a timestamp tag if the read-back fails, just to bust the cache.
  return buildAvatarPath(conn.jellyfinUserId, updated?.PrimaryImageTag ?? String(Date.now()));
}
