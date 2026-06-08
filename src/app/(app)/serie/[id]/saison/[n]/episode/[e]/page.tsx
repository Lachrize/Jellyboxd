import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveEpisode } from "@/lib/media/resolve";
import { episodeExternalId, seasonExternalId } from "@/lib/media";
import { getViewerMediaState } from "@/lib/media/viewer-state";
import { seasonHref } from "@/lib/links";
import { getMediaReviewSections } from "@/lib/services/reviews";
import { formatRuntime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FactsCard, SectionTitle } from "@/components/media/detail-hero";
import { PublicRatingBadge } from "@/components/media/public-rating-badge";
import { SeenToggle } from "@/components/tracking/seen-toggle";
import { ViewerEntries } from "@/components/tracking/viewer-entries";
import { ReviewSection } from "@/components/social/review-section";

type Params = { params: Promise<{ id: string; n: string; e: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, n, e } = await params;
  const resolved = await resolveEpisode(decodeURIComponent(id), Number(n), Number(e));
  return { title: resolved ? resolved.detail.name : "Épisode introuvable" };
}

export default async function EpisodePage({ params }: Params) {
  const { id, n, e } = await params;
  const externalId = decodeURIComponent(id);
  const seasonNumber = Number(n);
  const episodeNumber = Number(e);
  const resolved = await resolveEpisode(externalId, seasonNumber, episodeNumber);
  if (!resolved) notFound();
  const episode = resolved.detail;

  const user = await getCurrentUser();
  const episodeRef = {
    provider: resolved.providerName,
    externalId: episodeExternalId(externalId, seasonNumber, episodeNumber),
    kind: "EPISODE",
  };
  const [seriesState, seasonState, state] = await Promise.all([
    getViewerMediaState(externalId, user?.id ?? null, resolved.providerName),
    getViewerMediaState(seasonExternalId(externalId, seasonNumber), user?.id ?? null, resolved.providerName),
    getViewerMediaState(episodeRef.externalId, user?.id ?? null, resolved.providerName),
  ]);
  const parentWatched = seriesState.watched || seasonState.watched;

  const [reviewSections, viewerEntries] = await Promise.all([
    state.mediaItemId
      ? getMediaReviewSections(state.mediaItemId, user?.id ?? null)
      : Promise.resolve({ friends: [], community: [] }),
    user && state.mediaItemId
      ? db.watchEntry.findMany({
          where: { userId: user.id, mediaItemId: state.mediaItemId },
          orderBy: { watchedOn: "desc" },
          take: 1,
          include: { review: { select: { body: true, containsSpoilers: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href={seasonHref(externalId, seasonNumber)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground link-underline"
      >
        <ChevronLeft className="h-4 w-4" /> Saison {seasonNumber}
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative aspect-video w-full bg-surface-2">
          {episode.stillUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={episode.stillUrl} alt={episode.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  "radial-gradient(120% 120% at 70% -10%, rgb(var(--accent) / 0.14), transparent 55%), linear-gradient(160deg, rgb(var(--surface-3)), rgb(var(--background)))",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        </div>
        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="accent">S{seasonNumber} · E{episodeNumber}</Badge>
            <PublicRatingBadge value={episode.voteAverage} />
          </div>
          <h1 className="font-serif text-2xl text-foreground sm:text-3xl">{episode.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {episode.airDate && <span>{new Date(episode.airDate).toLocaleDateString("fr-FR")}</span>}
            {formatRuntime(episode.runtime) && <span>· {formatRuntime(episode.runtime)}</span>}
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SeenToggle
            mediaRef={episodeRef}
            initialWatched={parentWatched || state.watched}
            isAuthed={Boolean(user)}
          />
          <FactsCard
            items={[
              { label: "Saison", value: seasonNumber },
              { label: "Épisode", value: episodeNumber },
              { label: "Durée", value: formatRuntime(episode.runtime) },
              { label: "Note publique", value: episode.voteAverage ? `${(episode.voteAverage / 2).toFixed(1)} / 5` : null },
            ]}
          />
        </aside>

        <div className="space-y-12">
          {episode.overview && (
            <section>
              <SectionTitle>Synopsis</SectionTitle>
              <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{episode.overview}</p>
            </section>
          )}

          {viewerEntries.length > 0 && (
            <section>
              <SectionTitle>Votre avis</SectionTitle>
              <ViewerEntries
                entries={viewerEntries.map((ve) => ({
                  id: ve.id,
                  watchedOn: ve.watchedOn,
                  rating: ve.rating,
                  rewatch: ve.rewatch,
                  liked: ve.liked,
                  review: ve.review,
                }))}
              />
            </section>
          )}

          <ReviewSection
            title="Critiques des amis"
            emptyTitle="Aucune critique d'ami"
            emptyDescription="Les avis visibles par vos amis apparaîtront ici."
            reviews={reviewSections.friends}
            isAuthed={Boolean(user)}
            viewerUsername={user?.username}
          />

          <ReviewSection
            title="Critiques de la communauté"
            emptyTitle="Aucune critique publique pour l'instant"
            emptyDescription="Les avis publics apparaîtront ici."
            reviews={reviewSections.community}
            isAuthed={Boolean(user)}
            viewerUsername={user?.username}
          />
        </div>
      </div>
    </div>
  );
}
