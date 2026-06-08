"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn, formatRuntime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { episodeExternalId } from "@/lib/media/refs";
import { setEpisodeWatchedAction } from "@/server/actions/tracking";

export function EpisodeRow({
  seriesExternalId,
  seasonNumber,
  providerName,
  episode,
  href,
  initialWatched,
  isAuthed,
}: {
  seriesExternalId: string;
  seasonNumber: number;
  providerName: string;
  episode: { episodeNumber: number; name: string; overview?: string | null; runtime: number | null; airDate: string | null };
  href: string;
  initialWatched: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [watched, setWatched] = useState(initialWatched);

  function toggle() {
    if (!isAuthed) {
      toast({ title: "Connectez-vous pour suivre vos épisodes" });
      return;
    }
    const next = !watched;
    setWatched(next);
    startTransition(async () => {
      const res = await setEpisodeWatchedAction({
        ref: { provider: providerName, externalId: episodeExternalId(seriesExternalId, seasonNumber, episode.episodeNumber), kind: "EPISODE" },
        watched: next,
      });
      if (!res.ok) {
        setWatched(!next);
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-border-strong">
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={watched}
        aria-label={watched ? "Marquer comme non vu" : "Marquer comme vu"}
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          watched ? "border-accent bg-accent text-accent-foreground" : "border-border-strong text-muted hover:text-foreground",
        )}
      >
        {watched ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium tabular-nums text-muted">{episode.episodeNumber}</span>
          <Link href={href} className="truncate text-sm font-medium text-foreground hover:text-accent">
            {episode.name}
          </Link>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {episode.airDate && <span>{new Date(episode.airDate).toLocaleDateString("fr-FR")}</span>}
          {formatRuntime(episode.runtime) && <span>· {formatRuntime(episode.runtime)}</span>}
        </div>
        {episode.overview && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{episode.overview}</p>}
      </div>
    </div>
  );
}
