import { cn } from "@/lib/utils";

/**
 * Dependency-free charts for the admin analytics dashboard. Pure CSS/flex,
 * server-rendered (no client JS). Purple, minimal — matches Jellyboxd.
 */

export interface BarPoint {
  label: string;
  value: number;
  /** Tooltip heading (defaults to `label`). */
  title?: string;
  /** Tooltip detail line (defaults to `value unit`). */
  detail?: string;
}

/** Vertical bar chart for time series / histograms, with a rich hover tooltip. */
export function BarChart({
  data,
  height = 150,
  unit,
  labelEvery = 1,
  className,
}: {
  data: BarPoint[];
  height?: number;
  unit?: string;
  labelEvery?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={className}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const heading = d.title ?? d.label;
          const detail = d.detail ?? `${d.value}${unit ? " " + unit : ""}`;
          return (
            <div key={i} className="group relative flex flex-1 items-end" style={{ height: "100%" }}>
              {/* Custom tooltip (CSS-only, appears on hover) */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-left opacity-0 shadow-card-hover transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
                <div className="text-xs font-semibold text-foreground">{heading}</div>
                <div className="text-[11px] text-muted-foreground">{detail}</div>
                <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-surface-2" />
              </div>
              <div
                className="w-full rounded-t-[3px] bg-accent/80 transition-colors group-hover:bg-accent"
                style={{ height: `${Math.max(d.value > 0 ? 4 : 0, pct)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted">
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RankItem {
  title: string;
  subtitle?: string;
  value: number;
  valueLabel?: string;
}

/** Horizontal ranked bars for "top" lists. */
export function RankList({ items, emptyLabel = "Aucune donnée" }: { items: RankItem[]; emptyLabel?: string }) {
  if (!items.length) return <p className="p-5 text-sm text-muted">{emptyLabel}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-foreground">{it.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{it.valueLabel ?? it.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
            {it.subtitle && <p className="mt-0.5 truncate text-xs text-muted">{it.subtitle}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A KPI tile with optional trend delta. */
export function Kpi({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="surface-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 font-serif text-3xl text-foreground tabular-nums">{value}</p>
      {delta !== undefined && (
        <p className={cn("mt-0.5 text-xs tabular-nums", up ? "text-success" : "text-danger")}>
          {up ? "▲" : "▼"} {up ? "+" : ""}
          {delta} {deltaLabel}
        </p>
      )}
    </div>
  );
}
