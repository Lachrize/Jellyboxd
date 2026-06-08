import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { Poster } from "@/components/ui/poster";
import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";

export interface MediaCardProps {
  href: string;
  title: string;
  year?: number | null;
  kind?: string;
  posterUrl?: string | null;
  externalRating?: number | null; // 0..10
  userRating?: number | null; // 1..10 half-stars
  liked?: boolean;
  caption?: boolean;
  priority?: boolean;
  className?: string;
}

const KIND_LABEL: Record<string, string> = { MOVIE: "Film", SERIES: "Série", SEASON: "Saison", EPISODE: "Épisode" };

export function MediaCard({
  href,
  title,
  year,
  kind = "MOVIE",
  posterUrl,
  externalRating,
  userRating,
  liked,
  caption = true,
  priority,
  className,
}: MediaCardProps) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <div className="relative overflow-hidden rounded-xl transition-all duration-300 ease-spring group-hover:-translate-y-1 group-hover:shadow-card-hover group-hover:ring-1 group-hover:ring-accent/30">
        <Poster title={title} year={year} kind={kind} src={posterUrl} priority={priority} rounded="rounded-xl" />

        {externalRating ? (
          <span
            title="Note moyenne du public (TMDB), sur 5"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur"
          >
            <Star className="h-3 w-3 fill-accent text-accent" />
            {(externalRating / 2).toFixed(1)}
          </span>
        ) : null}
        {liked ? (
          <span className="absolute left-2 top-2 text-accent drop-shadow">
            <Heart className="h-4 w-4 fill-accent" />
          </span>
        ) : null}

        {/* hover scrim with title for posters that have artwork */}
        {posterUrl ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-fade-bottom p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="line-clamp-2 font-serif text-sm text-foreground">{title}</p>
          </div>
        ) : null}
      </div>

      {caption && (
        <div className="mt-2 px-0.5">
          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {title}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span>{year ?? KIND_LABEL[kind]}</span>
            {userRating ? <Stars value={userRating} size={11} /> : null}
          </div>
        </div>
      )}
    </Link>
  );
}

export function MediaGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6", className)}>
      {children}
    </div>
  );
}
