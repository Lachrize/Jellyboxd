import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Clock, Globe, User } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMovie } from "@/lib/media/resolve";
import { getViewerMediaState } from "@/lib/media/viewer-state";
import { getMediaReviewSections } from "@/lib/services/reviews";
import { formatRuntime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CinematicDetailHero, FactsCard, SectionTitle } from "@/components/media/detail-hero";
import { CastRow } from "@/components/media/cast-row";
import { PublicRatingBadge } from "@/components/media/public-rating-badge";
import { MediaActions } from "@/components/tracking/media-actions";
import { ViewerEntries } from "@/components/tracking/viewer-entries";
import { ReviewSection } from "@/components/social/review-section";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveMovie(decodeURIComponent(id));
  if (!resolved) return { title: "Film introuvable" };
  return { title: resolved.detail.title, description: resolved.detail.overview ?? undefined };
}

function MetaChip({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3 py-1.5 text-sm text-foreground backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 text-accent" />
      {children}
    </span>
  );
}

export default async function MoviePage({ params }: Params) {
  const externalId = decodeURIComponent((await params).id);
  const resolved = await resolveMovie(externalId);
  if (!resolved) notFound();
  const movie = resolved.detail;

  const user = await getCurrentUser();
  const state = await getViewerMediaState(externalId, user?.id ?? null, resolved.providerName);
  const mediaRef = { provider: resolved.providerName, externalId, kind: "MOVIE" };

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

  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : movie.year;
  const runtime = formatRuntime(movie.runtime);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <CinematicDetailHero
        title={movie.title}
        kind="MOVIE"
        year={movie.year}
        posterUrl={movie.posterUrl}
        backdropUrl={movie.backdropUrl}
        tagline={movie.tagline}
        overview={movie.overview}
        genres={movie.genres}
        badges={
          <>
            <Badge variant="accent">Film</Badge>
            <PublicRatingBadge value={movie.voteAverage} />
          </>
        }
        metaChips={
          <>
            {releaseYear && <MetaChip icon={Calendar}>{releaseYear}</MetaChip>}
            {runtime && <MetaChip icon={Clock}>{runtime}</MetaChip>}
            {movie.director && <MetaChip icon={User}>{movie.director}</MetaChip>}
            {movie.originalLanguage && <MetaChip icon={Globe}>{movie.originalLanguage.toUpperCase()}</MetaChip>}
          </>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <MediaActions
            mediaRef={mediaRef}
            initialRating={state.userRating}
            initialInWatchlist={state.inWatchlist}
            initialLiked={state.liked}
            isAuthed={Boolean(user)}
            defaultVisibility={user?.defaultVisibility ?? "PUBLIC"}
          />
          <FactsCard
            items={[
              { label: "Sortie", value: releaseYear },
              { label: "Durée", value: runtime },
              { label: "Réalisation", value: movie.director },
              { label: "Langue", value: movie.originalLanguage?.toUpperCase() },
              { label: "Note publique", value: movie.voteAverage ? `${(movie.voteAverage / 2).toFixed(1)} / 5` : null },
            ]}
          />
        </aside>

        <div className="space-y-8">
          {movie.cast.length > 0 && (
            <section className="surface-card p-5 sm:p-7">
              <SectionTitle>Distribution</SectionTitle>
              <CastRow cast={movie.cast} />
            </section>
          )}

          {viewerEntries.length > 0 && (
            <section className="surface-card p-5 sm:p-7">
              <SectionTitle>Votre avis</SectionTitle>
              <ViewerEntries
                entries={viewerEntries.map((e) => ({
                  id: e.id,
                  watchedOn: e.watchedOn,
                  rating: e.rating,
                  rewatch: e.rewatch,
                  liked: e.liked,
                  review: e.review,
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
