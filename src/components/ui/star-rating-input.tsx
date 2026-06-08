"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interactive half-star rating input. Value is the half-star int (1..10).
 * Clicking the left/right half of a star sets .5 / .0 granularity.
 */
export function StarRatingInput({
  value,
  onChange,
  size = 28,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 5 }).map((_, i) => {
          const full = (i + 1) * 2;
          const half = full - 1;
          const fillPct = display >= full ? 100 : display === half ? 50 : 0;
          return (
            <div key={i} className="relative" style={{ width: size, height: size }}>
              <Star width={size} height={size} className="absolute inset-0 text-border-strong" strokeWidth={1.5} />
              <Star
                width={size}
                height={size}
                className="absolute inset-0 fill-accent text-accent transition-[clip-path]"
                strokeWidth={1.5}
                style={{ clipPath: `inset(0 ${100 - fillPct}% 0 0)` }}
              />
              {/* left half */}
              <button
                type="button"
                aria-label={`${half / 2} étoiles`}
                className="absolute inset-y-0 left-0 w-1/2"
                onMouseEnter={() => setHover(half)}
                onClick={() => onChange(value === half ? null : half)}
              />
              {/* right half */}
              <button
                type="button"
                aria-label={`${full / 2} étoiles`}
                className="absolute inset-y-0 right-0 w-1/2"
                onMouseEnter={() => setHover(full)}
                onClick={() => onChange(value === full ? null : full)}
              />
            </div>
          );
        })}
      </div>
      <span className="min-w-[3ch] text-sm tabular-nums text-muted-foreground">
        {display ? (display / 2).toFixed(1) : "—"}
      </span>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted hover:text-foreground"
        >
          Effacer
        </button>
      )}
    </div>
  );
}
