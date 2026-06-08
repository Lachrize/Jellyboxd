import Link from "next/link";
import { Poster } from "@/components/ui/poster";
import { Badge } from "@/components/ui/badge";

export function DetailHero({
  title,
  kind = "MOVIE",
  year,
  posterUrl,
  backdropUrl,
  tagline,
  badges,
  meta,
}: {
  title: string;
  kind?: string;
  year?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  tagline?: string | null;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <section className="relative -mt-2 overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="absolute inset-0">
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdropUrl} alt="" className="h-full w-full object-cover opacity-40" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(120% 120% at 80% -10%, rgb(var(--accent) / 0.16), transparent 55%), linear-gradient(160deg, rgb(var(--surface-3)), rgb(var(--background)))",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent" />
      </div>

      <div className="relative grid grid-cols-[92px_1fr] gap-5 p-5 sm:grid-cols-[168px_1fr] sm:gap-7 sm:p-8">
        <Poster title={title} year={year} kind={kind} src={posterUrl} priority className="w-full shadow-card" />
        <div className="flex flex-col justify-end">
          {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
          <h1 className="font-serif text-2xl leading-tight text-foreground text-balance sm:text-4xl">{title}</h1>
          {tagline && <p className="mt-2 text-sm italic text-muted-foreground sm:text-base">« {tagline} »</p>}
          {meta && <div className="mt-3 text-sm text-muted-foreground">{meta}</div>}
        </div>
      </div>
    </section>
  );
}

/** Clean detail hero for film pages: aligned, readable, and intentionally simple. */
export function CinematicDetailHero({
  title,
  kind = "MOVIE",
  year,
  posterUrl,
  backdropUrl,
  tagline,
  overview,
  badges,
  metaChips,
  genres,
}: {
  title: string;
  kind?: string;
  year?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  tagline?: string | null;
  overview?: string | null;
  badges?: React.ReactNode;
  metaChips?: React.ReactNode;
  genres?: { id: string | number; name: string }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="absolute inset-0">
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdropUrl} alt="" className="h-full w-full object-cover opacity-25" />
        ) : (
          <div
            className="h-full w-full bg-grain"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 70% 0%, rgb(var(--accent) / 0.35), transparent), linear-gradient(180deg, rgb(var(--surface-3)), rgb(var(--background)))",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
      </div>

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
        <div className="mx-auto w-[150px] sm:w-[170px] lg:mx-0 lg:w-full">
          <Poster
            title={title}
            year={year}
            kind={kind}
            src={posterUrl}
            priority
            className="w-full shadow-card ring-1 ring-border"
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-5">
          <div className="space-y-3">
            {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            <div>
              <h1 className="font-serif text-4xl leading-none text-foreground text-balance sm:text-5xl">{title}</h1>
              {tagline && (
                <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-muted-foreground sm:text-base">
                  « {tagline} »
                </p>
              )}
            </div>
            {metaChips && <div className="flex flex-wrap gap-2">{metaChips}</div>}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-sm sm:p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">Résumé</p>
              {overview ? (
                <p className="text-[15px] leading-7 text-muted-foreground text-pretty">{overview}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun résumé disponible pour ce film.</p>
              )}
            </div>

            {genres && genres.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-sm sm:p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Link key={g.id} href={`/explore?kind=MOVIE&genre=${encodeURIComponent(g.name)}`}>
                      <Badge variant="default">{g.name}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FactsCard({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  const visible = items.filter((i) => i.value != null && i.value !== "");
  if (!visible.length) return null;
  return (
    <dl className="surface-card divide-y divide-border">
      {visible.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted">{i.label}</dt>
          <dd className="text-right text-sm font-medium text-foreground">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-serif text-xl text-foreground">{children}</h2>
      {action}
    </div>
  );
}
