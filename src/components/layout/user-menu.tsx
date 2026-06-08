"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BarChart3, BookMarked, List, LogOut, Settings, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/auth";

export function UserMenu({
  username,
  name,
  avatarUrl,
}: {
  username: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = [
    { href: `/u/${username}`, label: "Mon profil", icon: User },
    { href: "/journal", label: "Journal", icon: BookMarked },
    { href: "/listes", label: "Mes listes", icon: List },
    { href: "/stats", label: "Statistiques", icon: BarChart3 },
    { href: "/parametres", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name ?? username} src={avatarUrl} size="md" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 animate-scale-in overflow-hidden rounded-2xl border border-border bg-surface-2 p-1.5 shadow-card-hover">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{name ?? username}</p>
            <p className="truncate text-xs text-muted">@{username}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-3 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
