import { db } from "@/lib/db";

/**
 * Everyone on the shared Jellyfin server is a friend by design — there is no
 * request/accept flow. These helpers therefore treat the whole user base as a
 * single circle of friends, and everything is public.
 */

/** Number of other members on the server. */
export async function getFriendCount(userId: string): Promise<number> {
  const count = await db.user.count({ where: { NOT: { id: userId } } });
  return count;
}

/**
 * Visibility predicate helper. With a single public server there is no
 * restriction, so this always returns null ("see everything").
 */
export async function visibleVisibilitiesFor(
  _ownerId: string,
  _viewerId: string | null,
): Promise<string[] | null> {
  return null;
}
