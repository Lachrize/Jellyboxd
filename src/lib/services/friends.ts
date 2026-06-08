import { db } from "@/lib/db";

export type FriendshipState = "self" | "none" | "friends" | "incoming" | "outgoing";

/** Ids of a user's accepted friends (either direction of the request). */
export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await db.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const f = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(f);
}

/** Relationship of `viewer` toward `other` (for the friend button). */
export async function getFriendshipState(viewerId: string, otherId: string): Promise<FriendshipState> {
  if (viewerId === otherId) return "self";
  const f = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: viewerId },
      ],
    },
    select: { status: true, requesterId: true },
  });
  if (!f) return "none";
  if (f.status === "ACCEPTED") return "friends";
  return f.requesterId === viewerId ? "outgoing" : "incoming";
}

export async function getFriendCount(userId: string): Promise<number> {
  return db.friendship.count({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
}

export async function getIncomingRequests(userId: string) {
  return db.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { requester: { select: { id: true, username: true, name: true, avatarUrl: true } } },
  });
}

/**
 * Visibility predicate helper: which visibilities `viewer` may see from `owner`.
 * Returns null to mean "no restriction" (viewer is the owner -> sees everything).
 */
export async function visibleVisibilitiesFor(
  ownerId: string,
  viewerId: string | null,
): Promise<string[] | null> {
  if (viewerId && viewerId === ownerId) return null; // owner sees all
  const allowed = ["PUBLIC"];
  if (viewerId && (await areFriends(ownerId, viewerId))) allowed.push("FRIENDS");
  return allowed;
}
