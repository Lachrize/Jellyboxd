"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { toggleLikeAction } from "@/server/actions/social";
import type { LikeTarget } from "@/lib/constants";

export function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  isAuthed,
}: {
  targetType: LikeTarget;
  targetId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  function toggle() {
    if (!isAuthed) {
      toast({ title: "Connectez-vous pour aimer", variant: "default" });
      return;
    }
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLikeAction({ targetType, targetId });
      if (!res.ok) {
        setLiked(prevLiked);
        setCount(prevCount);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-accent" : "text-muted hover:text-foreground",
      )}
      aria-pressed={liked}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-accent")} />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
