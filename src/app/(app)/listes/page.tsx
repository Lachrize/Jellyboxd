import Link from "next/link";
import type { Metadata } from "next";
import { Bookmark, ListOrdered } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { listHref } from "@/lib/links";
import { externalIdFor } from "@/lib/media/local";
import { mediaHref } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/ui/poster";
import { CreateListDialog } from "@/components/lists/create-list-dialog";

export const metadata: Metadata = { title: "Mes listes" };

export default async function ListsPage() {
  const user = await requireUser();

  const lists = await db.list.findMany({
    where: { userId: user.id },
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { items: true } },
      items: {
        take: 3,
        orderBy: { position: "asc" },
        include: {
          mediaItem: {
            select: { title: true, kind: true, posterUrl: true, externalMappings: { select: { provider: true, externalId: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Mes listes</h1>
          <p className="mt-1 text-muted-foreground">Collections, watchlist, films à revoir…</p>
        </div>
        <CreateListDialog />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={listHref(list.id)}
            className="group surface-card overflow-hidden p-3 transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-card-hover"
          >
            <div className="grid grid-cols-3 gap-2">
              {list.items.length > 0 ? (
                list.items.map((it) => (
                  <Poster key={it.id} title={it.mediaItem.title} kind={it.mediaItem.kind} src={it.mediaItem.posterUrl} rounded="rounded-md" />
                ))
              ) : (
                <div className="col-span-3 flex aspect-[3/1.4] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted">
                  Liste vide
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {list.kind === "WATCHLIST" ? (
                <Bookmark className="h-4 w-4 text-accent" />
              ) : list.isRanked ? (
                <ListOrdered className="h-4 w-4 text-muted" />
              ) : null}
              <h3 className="truncate font-serif text-base text-foreground group-hover:text-accent">{list.title}</h3>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{list._count.items} œuvre{list._count.items > 1 ? "s" : ""}</span>
              {!list.isPublic && <Badge variant="muted">Privée</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
