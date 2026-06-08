import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  MOVIE: "Film",
  SERIES: "Série",
  SEASON: "Saison",
  EPISODE: "Épisode",
};

/**
 * Poster artwork with an elegant typographic fallback when no image exists
 * (the offline seed relies on this — fully on-brand, no broken images).
 */
export function Poster({
  title,
  year,
  kind = "MOVIE",
  src,
  className,
  rounded = "rounded-xl",
  priority,
}: {
  title: string;
  year?: number | null;
  kind?: string;
  src?: string | null;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden border border-border bg-surface-2",
        rounded,
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="poster-fallback">
          <span className="mb-auto text-[10px] font-medium uppercase tracking-[0.18em] text-accent/80">
            {KIND_LABEL[kind] ?? "Œuvre"}
          </span>
          <span className="font-serif text-lg leading-tight text-foreground text-balance">
            {title}
          </span>
          {year ? <span className="mt-1 text-xs text-muted">{year}</span> : null}
        </div>
      )}
    </div>
  );
}

export function Backdrop({
  title,
  src,
  className,
}: {
  title: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-surface-2", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="h-full w-full object-cover" decoding="async" />
      ) : (
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(120% 120% at 70% -10%, rgb(var(--accent) / 0.14), transparent 55%), linear-gradient(160deg, rgb(var(--surface-3)), rgb(var(--background)))",
          }}
        />
      )}
    </div>
  );
}
