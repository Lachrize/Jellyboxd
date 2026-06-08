import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { localMediaInclude, localMediaLink } from "@/lib/media/local";
import { profileHref } from "@/lib/links";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/ui/poster";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteListButton, RemoveFromListButton } from "@/components/lists/list-actions";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const list = await db.list.findUnique({ where: { id }, select: { title: true, isPublic: true } });
  return { title: list?.title ?? "Liste" };
}

export default async function ListPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const list = await db.list.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
      items: { orderBy: { position: "asc" }, include: { mediaItem: { include: localMediaInclude } } },
    },
  });

  if (!list) notFound();
  const isOwner = user?.id === list.user.id;
  if (!list.isPublic && !isOwner) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Link href={profileHref(list.user.username)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Avatar name={list.user.name ?? list.user.username} src={list.user.avatarUrl} size="xs" />
            {list.user.name ?? `@${list.user.username}`}
          </Link>
          {list.isRanked && (
            <Badge variant="muted">
              <ListOrdered className="h-3 w-3" /> Classée
            </Badge>
          )}
          {!list.isPublic && <Badge variant="muted">Privée</Badge>}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground">{list.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {list.items.length} œuvre{list.items.length > 1 ? "s" : ""}
            </p>
          </div>
          {isOwner && list.kind !== "WATCHLIST" && <DeleteListButton listId={list.id} />}
        </div>

        {list.description && (
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{list.description}</p>
        )}
      </header>

      {list.items.length === 0 ? (
        <EmptyState
          title="Cette liste est vide"
          description={isOwner ? "Ajoutez des œuvres depuis leur fiche détaillée." : "Revenez plus tard."}
        />
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {list.items.map((it, idx) => {
            const link = localMediaLink(it.mediaItem);
            return (
              <div key={it.id} className="group relative">
                {isOwner && <RemoveFromListButton listId={list.id} mediaItemId={it.mediaItemId} />}
                <Link href={link.href ?? "#"} className="block">
                  <div className="relative transition-all duration-300 ease-spring group-hover:-translate-y-1">
                    {list.isRanked && (
                      <span className="absolute left-1.5 top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-background/85 px-1.5 text-xs font-semibold text-accent backdrop-blur">
                        {idx + 1}
                      </span>
                    )}
                    <Poster title={link.title} kind={link.kind} src={link.posterUrl} rounded="rounded-xl" />
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-foreground group-hover:text-accent">{link.title}</p>
                  {link.subtitle && <p className="truncate text-xs text-muted">{link.subtitle}</p>}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
