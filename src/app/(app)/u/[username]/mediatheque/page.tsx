import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Grid3X3, Heart, List, MessageSquare, Rows3, Star, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserLibrary, type LibraryItem } from "@/lib/services/profile";
import { profileHref } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard, MediaGrid } from "@/components/media/media-card";
import { Poster } from "@/components/ui/poster";
import { cn } from "@/lib/utils";

type Params = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; view?: string }>;
};

const PAGE_SIZE = 50;
const VIEWS = ["posters", "compact", "list"] as const;
type LibraryView = (typeof VIEWS)[number];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({ where: { username }, select: { name: true, username: true } });
  return { title: user ? `Médiathèque de ${user.name ?? `@${user.username}`}` : "Médiathèque introuvable" };
}

function MetaBadges({ item }: { item: LibraryItem }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1 px-0.5">
      {item.rating ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-accent text-accent" />
          {(item.rating / 2).toFixed(1)}
        </span>
      ) : null}
      {item.hasReview ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          Critique
        </span>
      ) : null}
      {item.logged ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <Ticket className="h-3 w-3" />
          Vu
        </span>
      ) : null}
      {item.liked ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <Heart className="h-3 w-3 fill-accent text-accent" />
          Favori
        </span>
      ) : null}
    </div>
  );
}

function ViewLink({
  username,
  view,
  currentView,
  children,
}: {
  username: string;
  view: LibraryView;
  currentView: LibraryView;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/u/${username}/mediatheque?view=${view}`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
        currentView === view
          ? "border-accent/40 bg-accent/12 text-accent"
          : "border-border bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export default async function UserLibraryPage({ params, searchParams }: Params) {
  const { username } = await params;
  const query = await searchParams;
  const profile = await db.user.findUnique({ where: { username }, select: { id: true, username: true, name: true } });
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const items = await getUserLibrary(profile.id, viewer?.id ?? null);
  const currentPage = Math.max(1, Number(query.page ?? 1) || 1);
  const currentView = VIEWS.includes(query.view as LibraryView) ? (query.view as LibraryView) : "posters";
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (targetPage: number) =>
    `/u/${profile.username}/mediatheque?view=${currentView}&page=${targetPage}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={profileHref(profile.username)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground link-underline">
            <ArrowLeft className="h-4 w-4" />
            Retour au profil
          </Link>
          <h1 className="font-serif text-3xl text-foreground">Médiathèque</h1>
          <p className="mt-1 text-muted-foreground">
            Tous les films et séries notés, commentés, vus ou ajoutés aux favoris par {profile.name ?? `@${profile.username}`}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{items.length} œuvres</Badge>
          <Badge variant="muted">
            Page {page} / {totalPages}
          </Badge>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState title="Aucune œuvre" description="Rien à afficher pour le moment." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <ViewLink username={profile.username} view="posters" currentView={currentView}>
                <Grid3X3 className="h-4 w-4" />
                Affiches
              </ViewLink>
              <ViewLink username={profile.username} view="compact" currentView={currentView}>
                <Rows3 className="h-4 w-4" />
                Compact
              </ViewLink>
              <ViewLink username={profile.username} view="list" currentView={currentView}>
                <List className="h-4 w-4" />
                Liste
              </ViewLink>
            </div>
            <p className="text-sm text-muted-foreground">{pagedItems.length} œuvres affichées, maximum 50 par page.</p>
          </div>

          {currentView === "posters" && (
            <MediaGrid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5">
              {pagedItems.map((item, index) => (
                <div key={item.mediaItemId} className="min-w-0">
                  <MediaCard
                    href={item.link.href ?? "#"}
                    title={item.link.title}
                    kind={item.link.kind}
                    posterUrl={item.link.posterUrl}
                    userRating={item.rating}
                    liked={item.liked}
                    priority={index < 10}
                  />
                  <MetaBadges item={item} />
                </div>
              ))}
            </MediaGrid>
          )}

          {currentView === "compact" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pagedItems.map((item) => (
                <Link
                  key={item.mediaItemId}
                  href={item.link.href ?? "#"}
                  className="surface-card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
                >
                  <div className="w-12 shrink-0">
                    <Poster title={item.link.title} kind={item.link.kind} src={item.link.posterUrl} rounded="rounded-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.link.title}</p>
                    <p className="text-xs text-muted">{item.link.kind === "SERIES" ? "Série" : "Film"}</p>
                    <MetaBadges item={item} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {currentView === "list" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {pagedItems.map((item) => (
                <Link
                  key={item.mediaItemId}
                  href={item.link.href ?? "#"}
                  className="grid gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.link.title}</p>
                    <p className="text-xs text-muted">{item.link.kind === "SERIES" ? "Série" : "Film"}</p>
                  </div>
                  <MetaBadges item={item} />
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-6">
              {page > 1 ? (
                <Button variant="secondary" asChild>
                  <Link href={pageHref(page - 1)}>Précédent</Link>
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  Précédent
                </Button>
              )}
              <span className="text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
              {page < totalPages ? (
                <Button variant="secondary" asChild>
                  <Link href={pageHref(page + 1)}>Suivant</Link>
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  Suivant
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
