import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Le carnet de tout ce que vous regardez. Films &amp; séries, ensemble.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/explore" className="link-underline">Explorer</Link>
          <Link href="/parametres" className="link-underline">Paramètres</Link>
          <span className="text-muted">© {new Date().getFullYear()} Jellyboxd</span>
        </nav>
      </div>
    </footer>
  );
}
