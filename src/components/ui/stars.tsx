import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Read-only star display. `value` is the half-star int (1..10 == 0.5..5.0),
 * matching how ratings are stored.
 *
 * Implementation: a full-width row of outline stars with an overflow-clipped
 * overlay of filled stars on top. Both rows are `w-max` so the icons keep their
 * natural size and the overlay simply *clips* them (no flex shrink/overlap).
 */
export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number | null | undefined;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, ((value ?? 0) / 10) * 100));

  const Row = ({ filled }: { filled: boolean }) => (
    <span className="flex w-max gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          strokeWidth={1.5}
          className={cn("shrink-0", filled ? "fill-accent text-accent" : "text-border-strong")}
        />
      ))}
    </span>
  );

  return (
    <span
      className={cn("relative inline-flex w-max align-middle", className)}
      role="img"
      aria-label={value ? `${value / 2} sur 5` : "Non noté"}
    >
      <Row filled={false} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <Row filled />
      </span>
    </span>
  );
}
