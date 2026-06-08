import { Repeat2, Heart } from "lucide-react";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { truncate } from "@/lib/utils";

export interface ViewerEntry {
  id: string;
  watchedOn: Date;
  rating: number | null;
  rewatch: boolean;
  liked: boolean;
  review: { body: string; containsSpoilers: boolean } | null;
}

export function ViewerEntries({ entries }: { entries: ViewerEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-2.5">
      {entries.map((e) => (
        <div key={e.id} className="surface-card flex items-start gap-4 p-4">
          <div className="shrink-0 text-center">
            <div className="text-lg font-serif leading-none text-foreground">{e.watchedOn.getDate()}</div>
            <div className="text-[11px] uppercase text-muted">
              {e.watchedOn.toLocaleString("fr-FR", { month: "short" })}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {e.rating ? <Stars value={e.rating} size={13} /> : <span className="text-xs text-muted">Sans note</span>}
              {e.rewatch && (
                <Badge variant="muted">
                  <Repeat2 className="h-3 w-3" /> Re-vision
                </Badge>
              )}
              {e.liked && <Heart className="h-3.5 w-3.5 fill-accent text-accent" />}
              <span className="text-xs text-muted">{formatDate(e.watchedOn)}</span>
            </div>
            {e.review && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {truncate(e.review.body, 240)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
