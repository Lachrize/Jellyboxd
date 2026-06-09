"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: Array<[string, string]> = [
  ["7d", "7 j"],
  ["30d", "30 j"],
  ["90d", "90 j"],
  ["12m", "12 mois"],
  ["all", "Tout"],
];
const TYPE_OPTIONS: Array<[string, string]> = [
  ["all", "Tout"],
  ["movie", "Films"],
  ["series", "Séries"],
];

export function AdminFilters({ period, mediaType }: { period: string; mediaType: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Group label="Période" value={period} options={PERIOD_OPTIONS} onChange={(v) => setParam("period", v)} />
      <Group label="Type" value={mediaType} options={TYPE_OPTIONS} onChange={(v) => setParam("type", v)} />
    </div>
  );
}

function Group({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {options.map(([val, lab]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-colors",
              value === val ? "bg-accent/15 font-medium text-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lab}
          </button>
        ))}
      </div>
    </div>
  );
}
