import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveSeries } from "@/lib/media/resolve";
import { seasonHref } from "@/lib/links";
import { getViewerMediaState } from "@/lib/media/viewer-state";
import { getMediaReviewSections } from "@/lib/services/reviews";
import { formatRuntime, formatYearRange } from "@/lib/utils";
import type { SeriesStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/ui/poster";
import { DetailHero, FactsCard, SectionTitle } from "@/components/media/detail-hero";
import { CastRow } from "@/components/media/cast-row";
import { PublicRatingBadge } from "@/components/media/public-rating-badge";
import { MediaActions } from "@/components/tracking/media-actions";
import { SeriesStatusControl } from "@/components/tracking/series-status";
import { ViewerEntries } from "@/components/tracking/viewer-entries";
import { ReviewSection } from "@/components/social/review-section";

const STATUS_LABEL: Record<SeriesStatus, string> = {
  RETURNING: "En cours",
  ENDED: "Terminée",
  CANCELED: "Annulée",
  IN_PRODUCTION: "En production",
  PLANNED: "Prévue",
  UNKNOWN: "—",
};

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveSeries(decodeURIComponent(id));
  if (!resolved) return { title: "Série introuvable" };
  return { title: resolved.detail.title, description: resolved.detail.overview ?? undefined };
}

export default async function SeriesPage({ params }: Params) {
  const externalId = decodeURIComponent((await params).id);
  const resolved = await resolveSeries(externalId);
  if (!resolved) notFound();
  const series = resolved.detail;

  const user = await getCurrentUser();
  const state = await getViewerMediaState(externalId, user?.id ?? null, resolved.providerName);
  const mediaRef = { provider: resolved.providerName, externalId, kind: "SERIES" };

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
    <div className="space-y-10">
      <DetailHero
        title={series.title}
        kind="SERIES"
        year={series.firstAirYear}
        posterUrl={series.posterUrl}
        backdropUrl={series.backdropUrl}
        tagline={series.tagline}
        badges={
          <>
            <Badge variant="accent">Série</Badge>
            <Badge variant="outline">{STATUS_LABEL[series.status]}</Badge>
            <PublicRatingBadge value={series.voteAverage} />
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{formatYearRange(series.firstAirYear, series.lastAirYear)}</span>
            {series.numberOfSeasons && <span>· {series.numberOfSeasons} saison{series.numberOfSeasons > 1 ? "s" : ""}</span>}
            {series.numberOfEpisodes && <span>· {series.numberOfEpisodes} épisodes</span>}
            {series.network && <span>· {series.network}</span>}
          </div>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <MediaActions
            mediaRef={mediaRef}
            initialRating={state.userRating}
            initialInWatchlist={state.inWatchlist}
            initialLiked={state.liked}
            isAuthed={Boolean(user)}
            defaultVisibility={user?.defaultVisibility ?? "PUBLIC"}
          />
          <SeriesStatusControl mediaRef={mediaRef} initialStatus={state.seriesStatus} isAuthed={Boolean(user)} />
          <FactsCard
            items={[
              { label: "Statut", value: STATUS_LABEL[series.status] },
              { label: "Diffusion", value: formatYearRange(series.firstAirYear, series.lastAirYear) },
              { label: "Saisons", value: series.numberOfSeasons },
              { label: "Épisodes", value: series.numberOfEpisodes },
              { label: "Durée / épisode", value: formatRuntime(series.episodeRuntime) },
              { label: "Diffuseur", value: series.network },
            ]}
          />
        </aside>

        <div className="space-y-12">
          {series.overview && (
            <section>
              <SectionTitle>Synopsis</SectionTitle>
              <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{series.overview}</p>
            </section>
          )}

          {series.genres?.length ? (
            <div className="flex flex-wrap gap-2">
              {series.genres.map((g) => (
                <Link key={g.id} href={`/explore?kind=SERIES&genre=${encodeURIComponent(g.name)}`}>
                  <Badge>{g.name}</Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {series.seasons.length > 0 && (
            <section>
              <SectionTitle>Saisons</SectionTitle>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
                {series.seasons.map((s) => (
                  <Link key={s.seasonNumber} href={seasonHref(externalId, s.seasonNumber)} className="group block">
                    <div className="transition-all duration-300 ease-spring group-hover:-translate-y-1">
                      <Poster
                        title={s.name}
                        kind="SEASON"
                        src={s.posterUrl ?? series.posterUrl}
                        rounded="rounded-xl"
                      />
                    </div>
                    <p className="mt-2 truncate text-sm font-medium text-foreground group-hover:text-accent">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted">
                      {s.episodeCount ? `${s.episodeCount} ép.` : ""}
                      {s.airDate ? ` · ${new Date(s.airDate).getFullYear()}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {series.cast.length > 0 && (
            <section>
              <SectionTitle>Distribution</SectionTitle>
              <CastRow cast={series.cast} />
            </section>
          )}

          {viewerEntries.length > 0 && (
            <section>
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
