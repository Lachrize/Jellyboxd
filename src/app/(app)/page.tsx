import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, LogIn, Network, RefreshCw, Server } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPrimaryJellyfinServer } from "@/lib/jellyfin/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JellyfinConnect } from "@/components/settings/jellyfin-connect";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  const jellyfinServer = await getPrimaryJellyfinServer();

  if (jellyfinServer) {
    return (
      <div className="-mt-8">
        <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-grain" />
          <div className="relative mx-auto max-w-xl text-center">
            <Badge variant="accent" className="mb-6">
              <Server className="h-3 w-3" /> Serveur Jellyfin connecté
            </Badge>
            <h1 className="font-serif text-display text-foreground">
              Connectez-vous avec votre compte Jellyfin.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-muted-foreground text-pretty">
              Jellyboxd est relié à <span className="text-foreground">{jellyfinServer.name}</span>.
              Chaque utilisateur se connecte avec ses identifiants Jellyfin et retrouve son propre espace.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" /> Se connecter
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="-mt-8">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-grain" />
        <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-start">
          <div>
            <Badge variant="accent" className="mb-6">
              <Server className="h-3 w-3" /> Companion app pour Jellyfin
            </Badge>
            <h1 className="max-w-3xl font-serif text-display-lg text-foreground">
              Connectez votre serveur Jellyfin à Jellyboxd.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              Comme Jellyseerr ou Jellystat : installez Jellyboxd sur le même réseau que Jellyfin,
              renseignez l&apos;URL du serveur et une clé API, puis synchronisez vos films, séries,
              notes, vus et favoris.
            </p>
            <div className="mt-8 space-y-3">
              {[
                {
                  icon: Network,
                  title: "1. Même réseau",
                  body: "Lancez Jellyboxd sur votre NAS, Docker host ou serveur qui peut joindre Jellyfin.",
                },
                {
                  icon: KeyRound,
                  title: "2. Clé API Jellyfin",
                  body: "Créez une clé dans Tableau de bord → Clés API, puis collez-la dans Jellyboxd.",
                },
                {
                  icon: RefreshCw,
                  title: "3. Synchronisation",
                  body: "Choisissez l'utilisateur Jellyfin et lancez la première synchro.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/70 bg-surface-2/70 p-4">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">
              Déjà configuré ?{" "}
              <Link href="/login" className="font-medium text-accent link-underline">
                Se connecter
              </Link>
            </p>
          </div>

          <JellyfinConnect connection={null} redirectOnConnect />
        </div>
      </section>
    </div>
  );
}
