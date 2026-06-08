"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WATCH_PROGRESS_LABELS, type WatchProgressStatus } from "@/lib/constants";
import { setSeriesStatusAction } from "@/server/actions/tracking";
import type { MediaRef } from "./media-actions";

const OPTIONS: WatchProgressStatus[] = ["PLANNED", "WATCHING", "PAUSED", "COMPLETED", "DROPPED"];

export function SeriesStatusControl({
  mediaRef,
  initialStatus,
  isAuthed,
}: {
  mediaRef: MediaRef;
  initialStatus: WatchProgressStatus | null;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<WatchProgressStatus | null>(initialStatus);

  if (!isAuthed) return null;

  function choose(next: WatchProgressStatus) {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await setSeriesStatusAction({ ref: mediaRef, status: next });
      if (!res.ok) {
        setStatus(prev);
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        toast({ title: `Statut : ${WATCH_PROGRESS_LABELS[next]}`, variant: "success" });
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted">Suivi de la série</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => choose(opt)}
            disabled={pending}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              status === opt
                ? "border-accent/40 bg-accent/12 text-accent"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {WATCH_PROGRESS_LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
