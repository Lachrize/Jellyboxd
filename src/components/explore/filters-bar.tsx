"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Film, Tv } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "popularity", label: "Populaires" },
  { value: "rating", label: "Mieux notés" },
  { value: "recent", label: "Récents" },
];

export function FiltersBar({ genres }: { genres: { id: string | number; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const kind = params.get("kind") === "SERIES" ? "SERIES" : "MOVIE";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-border bg-surface p-1">
        {(["MOVIE", "SERIES"] as const).map((k) => (
          <button
            key={k}
            onClick={() => update("kind", k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              kind === k ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "MOVIE" ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
            {k === "MOVIE" ? "Films" : "Séries"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-2xl">
        <Select value={params.get("genre") ?? ""} onChange={(e) => update("genre", e.target.value)} aria-label="Genre">
          <option value="">Tous les genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select value={params.get("year") ?? ""} onChange={(e) => update("year", e.target.value)} aria-label="Année">
          <option value="">Toutes les années</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={params.get("sort") ?? "popularity"} onChange={(e) => update("sort", e.target.value)} aria-label="Tri">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
