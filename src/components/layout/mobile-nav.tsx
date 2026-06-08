"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Compass, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();
  const items = [
    { href: "/home", label: "Accueil", icon: Home },
    { href: "/explore", label: "Explorer", icon: Compass },
    { href: "/search", label: "Recherche", icon: Search },
    { href: "/journal", label: "Journal", icon: BookMarked },
    { href: `/u/${username}`, label: "Profil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
      <div
        className="mx-auto flex max-w-md items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-accent" : "text-muted hover:text-foreground",
              )}
            >
              <it.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
