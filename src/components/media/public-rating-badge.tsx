import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Public/community rating from the provider (TMDB), displayed on a /5 scale to
 * match the user's personal rating. The original /10 value is shown on hover.
 */
export function PublicRatingBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <Tooltip label={`Note moyenne du public (TMDB) · ${value.toFixed(1)}/10`}>
      <Badge variant="outline" className="cursor-help">
        <Star className="h-3 w-3 fill-accent text-accent" />
        {(value / 2).toFixed(1)}
        <span className="text-muted">/5</span>
      </Badge>
    </Tooltip>
  );
}
