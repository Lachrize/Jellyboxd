import Link from "next/link";
import type { Metadata } from "next";
import { BookMarked, Clapperboard, Compass, Film, Heart, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getFriendsFeed } from "@/lib/services/feed";
import { getFriendCount } from "@/lib/services/friends";
import { countSeenFilms, getFavorites } from "@/lib/services/profile";
import { getMediaProvider } from "@/lib/media";
import { externalIdFor } from "@/lib/media/local";
import { mediaHref } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Poster } from "@/components/ui/poster";
import { MediaCard, MediaGrid } from "@/components/media/media-card";
import { SectionTitle } from "@/components/media/detail-hero";
import { FeedItem } from "@/components/social/feed-item";

export const metadata: Metadata = { title: "Accueil" };

function StatPill({ icon: Icon, value, label }: { icon: typeof Film; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/80 px-4 py-3 backdrop-blur">
      <Icon className="mb-2 h-4 w-4 text-accent" />
      <div className="font-serif text-2xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    friendsFeed,
    watchlist,
    favorites,
    monthWatches,
    filmsSeen,
    friendCount,
    ratings,
    trending,
  ] = await Promise.all([
    getFriendsFeed(user.id, 10),
    db.list.findFirst({
      where: { userId: user.id, kind: "WATCHLIST" },
      include: {
        items: {
          take: 6,
          orderBy: { addedAt: "desc" },
          include: { mediaItem: { include: { externalMappings: { select: { provider: true, externalId: true } } } } },
        },
      },
    }),
    getFavorites(user.id, 6),
    db.watchEntry.count({ where: { userId: user.id, watchedOn: { gte: monthStart } } }),
    countSeenFilms(user.id),
    getFriendCount(user.id),
    db.rating.findMany({ where: { userId: user.id }, select: { value: true } }),
    getMediaProvider().trending().then((items) => items.slice(0, 10)),
  ]);

  const avgRating = ratings.length
    ? (ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length / 2).toFixed(1)
    : "—";
  const firstName = user.name?.split(" ")[0] ?? user.username;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grain" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bienvenue</p>
              <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Bonjour, {firstName}.</h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Votre espace pour retrouver vos favoris, suivre vos amis et découvrir quoi regarder ensuite.
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/explore">
                <Compass className="h-4 w-4" /> Explorer
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill icon={Clapperboard} value={String(monthWatches)} label="Visionnages ce mois" />
            <StatPill icon={Film} value={String(filmsSeen)} label="Films vus" />
            <StatPill icon={Star} value={avgRating} label="Note moyenne" />
            <StatPill icon={Users} value={String(friendCount)} label="Amis" />
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle action={<Link href={`/u/${user.username}`} className="text-sm text-muted-foreground link-underline">Profil</Link>}>
            Favoris
          </SectionTitle>
          {favorites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Aucun favori pour le moment.{" "}
              <Link href="/explore" className="text-accent link-underline">
                Explorez le catalogue
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3">
              {favorites.map((favorite) => (
                <Link key={favorite.mediaItemId} href={favorite.link.href ?? "#"} className="group block">
                  <div className="relative">
                    <span className="absolute left-1.5 top-1.5 z-10 text-accent drop-shadow">
                      <Heart className="h-4 w-4 fill-accent" />
                    </span>
                    <Poster
                      title={favorite.link.title}
                      kind={favorite.link.kind}
                      src={favorite.link.posterUrl}
                      rounded="rounded-xl"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle action={<Link href="/listes" className="text-sm text-muted-foreground link-underline">Tout</Link>}>
            Watchlist
          </SectionTitle>
          {watchlist && watchlist.items.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3">
              {watchlist.items.map((it) => {
                const ext = externalIdFor(it.mediaItem.externalMappings);
                return (
                  <Link key={it.id} href={ext ? mediaHref(it.mediaItem.kind, ext) : "#"}>
                    <Poster title={it.mediaItem.title} kind={it.mediaItem.kind} src={it.mediaItem.posterUrl} rounded="rounded-xl" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Votre watchlist est vide.{" "}
              <Link href="/explore" className="text-accent link-underline">
                Ajoutez des œuvres
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle action={<Link href="/search" className="text-sm text-muted-foreground link-underline">Rechercher</Link>}>
          Activité des amis
        </SectionTitle>
        {friendsFeed.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Pas encore d'activité d'amis"
            description="Ajoutez des amis pour voir leurs notes, critiques et visionnages ici."
            action={
              <Button asChild>
                <Link href="/search">Trouver des amis</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {friendsFeed.map((item) => (
              <FeedItem key={item.id} item={item} isAuthed />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<Link href="/explore" className="text-sm text-muted-foreground link-underline">Voir tout</Link>}>
          À découvrir
        </SectionTitle>
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment.</p>
        ) : (
          <MediaGrid className="md:grid-cols-5 lg:grid-cols-5">
            {trending.map((m, i) => (
              <MediaCard
                key={`${m.kind}-${m.externalId}`}
                href={mediaHref(m.kind, m.externalId)}
                title={m.title}
                year={m.year}
                kind={m.kind}
                posterUrl={m.posterUrl}
                externalRating={m.voteAverage}
                priority={i < 5}
              />
            ))}
          </MediaGrid>
        )}
      </section>

      <div className="surface-card flex items-start gap-3 p-4">
        <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          Astuce : notez ou journalisez une œuvre pour enrichir vos stats et alimenter votre fil d&apos;activité.
        </p>
      </div>
    </div>
  );
}
