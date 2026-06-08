import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Clapperboard, Clock, Film, Star, Tv, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Stars } from "@/components/ui/stars";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/media/detail-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Statistiques" };

type StatsSearchParams = {
  genre?: string;
  rating?: string;
  minRuntime?: string;
  kind?: string;
};

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground " +
  "transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30";

const KIND_LABELS: Record<string, string> = {
  MOVIE: "Films",
  SERIES: "Séries",
  EPISODE: "Épisodes",
};
const RATING_VALUES = Array.from({ length: 10 }, (_, i) => i + 1);
const RUNTIME_VALUES = [90, 120, 180];

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="surface-card p-5">
      <Icon className="mb-3 h-5 w-5 text-accent" />
      <div className="font-serif text-2xl text-foreground">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function ratingLabel(value: number) {
  const rating = (value / 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${rating} étoile${value > 2 ? "s" : ""}`;
}

function runtimeLabel(minutes: number) {
  if (minutes === 180) return "Plus de 3 h";
  if (minutes === 120) return "Plus de 2 h";
  if (minutes === 90) return "Plus de 1 h 30";
  return `Plus de ${minutes} min`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<StatsSearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const ratingParam = params.rating ? Number(params.rating) : null;
  const runtimeParam = params.minRuntime ? Number(params.minRuntime) : null;

  const selectedGenre = params.genre?.trim() ?? "";
  const selectedKind = params.kind && KIND_LABELS[params.kind] ? params.kind : "";
  const selectedRating = ratingParam && RATING_VALUES.includes(ratingParam) ? ratingParam : null;
  const minRuntime = runtimeParam && RUNTIME_VALUES.includes(runtimeParam) ? runtimeParam : null;

  const entries = await db.watchEntry.findMany({
    where: { userId: user.id },
    select: {
      rating: true,
      mediaItem: {
        select: {
          kind: true,
          runtime: true,
          genres: { select: { name: true } },
        },
      },
    },
  });

  const availableGenres = [
    ...new Set(entries.flatMap((entry) => entry.mediaItem.genres.map((genre) => genre.name))),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  const filteredEntries = entries.filter((entry) => {
    if (selectedKind && entry.mediaItem.kind !== selectedKind) return false;
    if (selectedGenre && !entry.mediaItem.genres.some((genre) => genre.name === selectedGenre)) return false;
    if (selectedRating && entry.rating !== selectedRating) return false;
    if (minRuntime && (entry.mediaItem.runtime ?? 0) < minRuntime) return false;
    return true;
  });

  const films = filteredEntries.filter((e) => e.mediaItem.kind === "MOVIE").length;
  const series = filteredEntries.filter((e) => e.mediaItem.kind === "SERIES").length;
  const episodes = filteredEntries.filter((e) => e.mediaItem.kind === "EPISODE").length;
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.mediaItem.runtime ?? 0), 0);
  const hours = Math.round(totalMinutes / 60);
  const filteredRatings = filteredEntries
    .map((entry) => entry.rating)
    .filter((rating): rating is number => rating != null);

  // Rating distribution (1..10 half-stars -> 5 full-star buckets for readability)
  const buckets = Array.from({ length: 10 }, (_, i) => filteredRatings.filter((rating) => rating === i + 1).length);
  const maxBucket = Math.max(1, ...buckets);
  const avgRating = filteredRatings.length
    ? (filteredRatings.reduce((sum, rating) => sum + rating, 0) / filteredRatings.length / 2).toFixed(2)
    : null;

  // Top genres across watched media
  const genreTally = new Map<string, number>();
  for (const e of filteredEntries) for (const g of e.mediaItem.genres) genreTally.set(g.name, (genreTally.get(g.name) ?? 0) + 1);
  const topGenres = [...genreTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre = Math.max(1, ...topGenres.map(([, n]) => n));
  const activeFilters = [
    selectedKind ? KIND_LABELS[selectedKind] : null,
    selectedGenre || null,
    selectedRating ? ratingLabel(selectedRating) : null,
    minRuntime ? runtimeLabel(minRuntime) : null,
  ].filter(Boolean);

  if (entries.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="font-serif text-3xl text-foreground">Statistiques</h1>
        <EmptyState
          icon={BarChart3}
          title="Pas encore de données"
          description="Journalisez et notez des œuvres pour voir vos statistiques prendre vie."
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Statistiques</h1>
        <p className="mt-1 text-muted-foreground">Le portrait de votre culture visuelle.</p>
      </header>

      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-foreground">Filtres</h2>
            <p className="mt-1 text-sm text-muted-foreground">Affinez vos statistiques par type, genre, note ou durée.</p>
          </div>
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/stats">Réinitialiser</Link>
            </Button>
          )}
        </div>

        <form action="/stats" className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Type</span>
            <select name="kind" defaultValue={selectedKind} className={fieldClass}>
              <option value="">Tous</option>
              <option value="MOVIE">Films</option>
              <option value="SERIES">Séries</option>
              <option value="EPISODE">Épisodes</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Genre</span>
            <select name="genre" defaultValue={selectedGenre} className={fieldClass}>
              <option value="">Tous les genres</option>
              {availableGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Note exacte</span>
            <select name="rating" defaultValue={selectedRating ?? ""} className={fieldClass}>
              <option value="">Toutes</option>
              {RATING_VALUES.map((value) => (
                <option key={value} value={value}>
                  {ratingLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Durée</span>
            <select name="minRuntime" defaultValue={minRuntime ?? ""} className={fieldClass}>
              <option value="">Toutes durées</option>
              <option value="90">Plus de 1 h 30</option>
              <option value="120">Plus de 2 h</option>
              <option value="180">Plus de 3 h</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Appliquer
            </Button>
          </div>
        </form>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge key={filter} variant="accent">
                {filter}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aucun visionnage avec ces filtres"
          description="Essayez d'élargir le genre, la note ou la durée."
        />
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard icon={Clapperboard} value={String(filteredEntries.length)} label="Visionnages" />
        <StatCard icon={Film} value={String(films)} label="Films journalisés" />
        <StatCard icon={Tv} value={String(series)} label="Séries journalisées" />
        <StatCard icon={Clapperboard} value={String(episodes)} label="Épisodes vus" />
        <StatCard icon={Clock} value={`${hours} h`} label="Temps de visionnage" />
      </div>

      <section>
        <SectionTitle
          action={
            avgRating ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-accent text-accent" /> Moyenne {avgRating}
              </span>
            ) : null
          }
        >
          Répartition des notes
        </SectionTitle>
        {filteredRatings.length === 0 ? (
          <p className="text-sm text-muted">Aucun visionnage noté dans cette sélection.</p>
        ) : (
          <div className="surface-card flex items-end justify-between gap-1.5 p-5 sm:gap-3">
            {buckets.map((count, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted">{count || ""}</span>
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-accent/80 transition-all"
                    style={{ height: `${(count / maxBucket) * 100}%`, minHeight: count ? 4 : 0 }}
                  />
                </div>
                <Stars value={i + 1} size={9} />
              </div>
            ))}
          </div>
        )}
      </section>

      {topGenres.length > 0 && (
        <section>
          <SectionTitle>Genres les plus vus</SectionTitle>
          <div className="surface-card space-y-3 p-5">
            {topGenres.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-muted-foreground">{name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(count / maxGenre) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
