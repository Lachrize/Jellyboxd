"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({ className, defaultValue = "" }: { className?: string; defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className={cn("relative w-full", className)}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un film, une série, un utilisateur…"
        aria-label="Rechercher"
        className="h-10 w-full rounded-full border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
    </form>
  );
}
