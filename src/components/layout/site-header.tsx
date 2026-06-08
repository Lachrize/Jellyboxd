import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/lib/auth/current-user";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";
import { NavLinks } from "./nav-links";

export function SiteHeader({ user }: { user: SafeUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link href={user ? "/home" : "/"} aria-label="Jellyboxd" className="shrink-0">
          <Logo />
        </Link>
        {user && <NavLinks className="hidden md:flex" />}

        <div className="ml-auto flex items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <SearchBar className="hidden w-56 lg:block" />
          {user ? (
            <UserMenu username={user.username} name={user.name} avatarUrl={user.avatarUrl} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Connexion</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Créer un compte</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
