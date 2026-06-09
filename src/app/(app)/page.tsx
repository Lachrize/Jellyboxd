import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound, Network, PlugZap, RefreshCw, Server } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <div className="-mt-8">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-grain" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
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
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Connecter mon serveur <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">J&apos;ai déjà un compte</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">
              Après l&apos;inscription, vous arrivez directement sur l&apos;écran de connexion Jellyfin.
            </p>
          </div>

          <div className="surface-card overflow-hidden p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <PlugZap className="h-5 w-5 text-accent" />
              <h2 className="font-serif text-xl text-foreground">Configuration rapide</h2>
            </div>
            <div className="space-y-3">
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
          </div>
        </div>
      </section>
    </div>
  );
}
