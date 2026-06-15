import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Heart, Settings } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserReviews } from "@/lib/services/reviews";
import { countSeenFilms, getFavorites, getUserLibrary } from "@/lib/services/profile";
import { listHref } from "@/lib/links";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/ui/poster";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/media/detail-hero";
import { MediaCard } from "@/components/media/media-card";
import { ReviewCard } from "@/components/social/review-card";
import { formatDate } from "@/lib/dates";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username }, select: { name: true, username: true } });
  return { title: u ? (u.name ?? `@${u.username}`) : "Profil introuvable" };
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-serif text-xl text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  const profile = await db.user.findUnique({ where: { username } });
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;

  const [filmsLogged, seriesTracked, reviewsCount, recent, favorites, reviews, lists] =
    await Promise.all([
      countSeenFilms(profile.id),
      db.seriesProgress.count({ where: { userId: profile.id } }),
      db.review.count({ where: { userId: profile.id } }),
      getUserLibrary(profile.id, viewer?.id ?? null, 10),
      getFavorites(profile.id, 12),
      getUserReviews(profile.id, viewer?.id ?? null, 4),
      db.list.findMany({
        where: { userId: profile.id, isPublic: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { _count: { select: { items: true } } },
      }),
    ]);

  return (
    <div className="space-y-10">
      <header className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="h-24 bg-grain sm:h-32" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar name={profile.name ?? profile.username} src={profile.avatarUrl} size="xl" className="ring-4 ring-surface" />
              <div className="pb-1">
                <h1 className="font-serif text-2xl text-foreground">{profile.name ?? `@${profile.username}`}</h1>
                <p className="text-sm text-muted">@{profile.username}</p>
              </div>
            </div>
            {isSelf ? (
              <Button variant="secondary" asChild>
                <Link href="/parametres">
                  <Settings className="h-4 w-4" /> Modifier le profil
                </Link>
              </Button>
            ) : null}
          </div>

          {profile.bio && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{profile.bio}</p>}

          <div className="mt-5 flex items-center gap-6">
            <Stat value={filmsLogged} label="Films" />
            <Stat value={seriesTracked} label="Séries" />
            <Stat value={reviewsCount} label="Critiques" />
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" /> Membre depuis {formatDate(profile.createdAt)}
          </p>
        </div>
      </header>

      <section>
        <SectionTitle action={<Link href={`/u/${profile.username}/mediatheque`} className="text-sm text-muted-foreground link-underline">Voir tout</Link>}>
          Films & séries récents
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title="Aucune œuvre" description="Notez, commentez ou ajoutez une œuvre aux favoris pour la voir apparaître ici." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
            {recent.map((item) => (
              <MediaCard
                key={item.mediaItemId}
                href={item.link.href ?? "#"}
                title={item.link.title}
                kind={item.link.kind}
                posterUrl={item.link.posterUrl}
                userRating={item.rating}
                liked={item.liked}
              />
            ))}
          </div>
        )}
      </section>

      {favorites.length > 0 && (
        <section>
          <SectionTitle>Favoris</SectionTitle>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
            {favorites.map((f) => (
              <Link key={f.mediaItemId} href={f.link.href ?? "#"} className="group block">
                <div className="relative transition-all duration-300 ease-spring group-hover:-translate-y-1">
                  <span className="absolute left-1.5 top-1.5 z-10 text-accent drop-shadow">
                    <Heart className="h-4 w-4 fill-accent" />
                  </span>
                  <Poster title={f.link.title} kind={f.link.kind} src={f.link.posterUrl} rounded="rounded-xl" />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-foreground group-hover:text-accent">{f.link.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section>
          <SectionTitle>Critiques</SectionTitle>
          <div className="space-y-3">
            {reviews.map(({ data, media }) => (
              <ReviewCard
                key={data.id}
                review={data}
                isAuthed={Boolean(viewer)}
                canDelete={isSelf}
                context={
                  media.href ? (
                    <Link href={media.href} className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
                      {media.title}
                      {media.subtitle ? ` · ${media.subtitle}` : ""}
                    </Link>
                  ) : null
                }
              />
            ))}
          </div>
        </section>
      )}

      {lists.length > 0 && (
        <section>
          <SectionTitle>Listes</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <Link key={l.id} href={listHref(l.id)} className="surface-card flex items-center justify-between p-4 transition-colors hover:border-border-strong">
                <span className="truncate font-medium text-foreground">{l.title}</span>
                <span className="shrink-0 text-xs text-muted">{l._count.items} œuvres</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
