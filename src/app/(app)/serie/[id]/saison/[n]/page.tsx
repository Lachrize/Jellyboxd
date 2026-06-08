import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveSeason } from "@/lib/media/resolve";
import { seasonExternalId } from "@/lib/media";
import { getViewerMediaState } from "@/lib/media/viewer-state";
import { episodeHref, seriesHref } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { DetailHero, SectionTitle } from "@/components/media/detail-hero";
import { MediaActions } from "@/components/tracking/media-actions";
import { EpisodeRow } from "@/components/tracking/episode-row";

type Params = { params: Promise<{ id: string; n: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, n } = await params;
  const resolved = await resolveSeason(decodeURIComponent(id), Number(n));
  if (!resolved) return { title: "Saison introuvable" };
  return { title: `${resolved.detail.seriesTitle} — ${resolved.detail.name}` };
}

export default async function SeasonPage({ params }: Params) {
  const { id, n } = await params;
  const externalId = decodeURIComponent(id);
  const seasonNumber = Number(n);
  const resolved = await resolveSeason(externalId, seasonNumber);
  if (!resolved) notFound();
  const season = resolved.detail;
  const providerName = resolved.providerName;

  const user = await getCurrentUser();
  const seasonRef = {
    provider: providerName,
    externalId: seasonExternalId(externalId, seasonNumber),
    kind: "SEASON",
  };
  const state = await getViewerMediaState(seasonRef.externalId, user?.id ?? null, providerName);

  const watched = new Set<number>();
  if (user) {
    const entries = await db.watchEntry.findMany({
      where: {
        userId: user.id,
        mediaItem: {
          episode: {
            seasonNumber,
            series: { mediaItem: { externalMappings: { some: { provider: providerName, externalId } } } },
          },
        },
      },
      select: { mediaItem: { select: { episode: { select: { episodeNumber: true } } } } },
    });
    entries.forEach((e) => {
      const ep = e.mediaItem.episode?.episodeNumber;
      if (ep) watched.add(ep);
    });
  }

  const total = season.episodes.length;
  const seen = season.episodes.filter((e) => watched.has(e.episodeNumber)).length;
  const pct = total ? Math.round((seen / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <Link
        href={seriesHref(externalId)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground link-underline"
      >
        <ChevronLeft className="h-4 w-4" /> {season.seriesTitle}
      </Link>

      <DetailHero
        title={season.name}
        kind="SEASON"
        posterUrl={season.posterUrl}
        badges={<Badge variant="accent">Saison</Badge>}
        meta={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{total} épisode{total > 1 ? "s" : ""}</span>
            {season.airDate && <span>· {new Date(season.airDate).getFullYear()}</span>}
            {user && <span>· {seen}/{total} vus</span>}
          </div>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <MediaActions
            mediaRef={seasonRef}
            initialRating={state.userRating}
            initialInWatchlist={state.inWatchlist}
            initialLiked={state.liked}
            isAuthed={Boolean(user)}
            allowRating={false}
            defaultVisibility={user?.defaultVisibility ?? "PUBLIC"}
          />
          {user && total > 0 && (
            <div className="surface-card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">Progression</span>
                <span className="font-medium text-foreground">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          {season.overview && (
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{season.overview}</p>
          )}
          <section>
            <SectionTitle>Épisodes</SectionTitle>
            <div className="space-y-2.5">
              {season.episodes.map((e) => (
                <EpisodeRow
                  key={e.episodeNumber}
                  seriesExternalId={externalId}
                  seasonNumber={seasonNumber}
                  providerName={providerName}
                  episode={e}
                  href={episodeHref(externalId, seasonNumber, e.episodeNumber)}
                  initialWatched={watched.has(e.episodeNumber)}
                  isAuthed={Boolean(user)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
