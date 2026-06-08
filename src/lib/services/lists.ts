import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

/** Every user has exactly one special WATCHLIST; create it lazily. */
export async function getOrCreateWatchlist(userId: string) {
  const existing = await db.list.findFirst({ where: { userId, kind: "WATCHLIST" } });
  if (existing) return existing;
  return db.list.create({
    data: {
      userId,
      title: "Ma watchlist",
      slug: "watchlist",
      kind: "WATCHLIST",
      isPublic: true,
    },
  });
}

/** Returns a per-user unique slug for a new list title. */
export async function uniqueListSlug(userId: string, title: string): Promise<string> {
  const base = slugify(title) || "liste";
  let slug = base;
  let i = 2;
  while (await db.list.findUnique({ where: { userId_slug: { userId, slug } } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
