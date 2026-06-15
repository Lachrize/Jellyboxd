import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveSeries } from "@/lib/media/resolve";
import { seasonHref } from "@/lib/links";
import { getViewerMediaState } from "@/lib/media/viewer-state";
import { getMediaReviews } from "@/lib/services/reviews";
import { getViewerActivityEntries } from "@/lib/services/viewer-activity";
import { formatRuntime, formatYearRange } from "@/lib/utils";
import type { SeriesStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/ui/poster";
import { DetailHero, FactsCard, SectionTitle } from "@/components/media/detail-hero";
import { CastRow } from "@/components/media/cast-row";
import { PublicRatingBadge } from "@/components/media/public-rating-badge";
import { MediaActions } from "@/components/tracking/media-actions";
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

  const [reviews, viewerEntries] = await Promise.all([
    state.mediaItemId
      ? getMediaReviews(state.mediaItemId, user?.id ?? null)
      : Promise.resolve([]),
    getViewerActivityEntries(user?.id, state.mediaItemId),
  ]);
  const totalEpisodes = series.seasons.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);
  const seriesWatchEntries =
    user && state.seriesId && !state.watched
      ? await db.seenMedia.findMany({
          where: {
            userId: user.id,
            mediaItem: {
              OR: [
                { season: { seriesId: state.seriesId } },
                { episode: { seriesId: state.seriesId } },
              ],
            },
          },
          select: {
            mediaItem: {
              select: {
                season: { select: { seasonNumber: true } },
                episode: { select: { seasonNumber: true, episodeNumber: true } },
              },
            },
          },
        })
      : [];
  const watchedSeasons = new Set<number>();
  const watchedEpisodes = new Set<string>();
  for (const entry of seriesWatchEntries) {
    const seasonEntry = entry.mediaItem.season;
    if (seasonEntry) watchedSeasons.add(seasonEntry.seasonNumber);
    const episodeEntry = entry.mediaItem.episode;
    if (episodeEntry) watchedEpisodes.add(`${episodeEntry.seasonNumber}:${episodeEntry.episodeNumber}`);
  }
  const seenEpisodes = state.watched
    ? totalEpisodes
    : series.seasons.reduce((sum, season) => {
        if (watchedSeasons.has(season.seasonNumber)) return sum + (season.episodeCount ?? 0);
        return sum + [...watchedEpisodes].filter((key) => key.startsWith(`${season.seasonNumber}:`)).length;
      }, 0);
  const progressPct = totalEpisodes ? Math.round((seenEpisodes / totalEpisodes) * 100) : 0;

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
            initialWatched={state.watched}
            initialInWatchlist={state.inWatchlist}
            initialLiked={state.liked}
            isAuthed={Boolean(user)}
          />
          {user && totalEpisodes > 0 && (
            <div className="surface-card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">Progression</span>
                <span className="font-medium text-foreground">
                  {seenEpisodes}/{totalEpisodes} épisodes
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
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
                entries={viewerEntries}
              />
            </section>
          )}

          <ReviewSection
            title="Critiques"
            emptyTitle="Aucune critique pour l'instant"
            emptyDescription="Soyez le premier à donner votre avis."
            reviews={reviews}
            isAuthed={Boolean(user)}
            viewerUsername={user?.username}
          />
        </div>
      </div>
    </div>
  );
}
