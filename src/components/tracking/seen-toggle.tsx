"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { setMediaWatchedAction } from "@/server/actions/tracking";
import type { MediaRef } from "./media-actions";

export function SeenToggle({
  mediaRef,
  initialWatched,
  isAuthed,
  locked = false,
  onWatchedChange,
  className,
  compact = false,
}: {
  mediaRef: MediaRef;
  initialWatched: boolean;
  isAuthed: boolean;
  locked?: boolean;
  onWatchedChange?: (watched: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [watched, setWatched] = useState(initialWatched || locked);

  useEffect(() => {
    setWatched(initialWatched || locked);
  }, [initialWatched, locked]);

  function toggle() {
    if (!isAuthed) {
      toast({ title: "Connectez-vous pour marquer cette œuvre comme vue" });
      return;
    }

    if (locked) {
      toast({ title: "Retirez votre note pour décocher « Vu »" });
      return;
    }

    const next = !watched;
    setWatched(next);
    startTransition(async () => {
      const res = await setMediaWatchedAction({ ref: mediaRef, watched: next });
      if (!res.ok) {
        setWatched(!next);
        toast({ title: "Erreur", description: res.error, variant: "error" });
        return;
      }

      const nextWatched = Boolean(res.data?.watched);
      setWatched(nextWatched);
      onWatchedChange?.(nextWatched);
      router.refresh();
    });
  }

  const displayWatched = locked || watched;

  return (
    <Button
      type="button"
      variant={displayWatched ? "outline" : "secondary"}
      size={compact ? "sm" : "md"}
      onClick={toggle}
      disabled={pending || locked}
      aria-pressed={displayWatched}
      title={locked ? "Une note est enregistrée : retirez-la pour décocher." : undefined}
      className={cn("w-full justify-start", displayWatched && "border-accent/40 text-accent", className)}
    >
      {displayWatched ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {displayWatched ? "Vu" : "Marquer comme vu"}
    </Button>
  );
}
