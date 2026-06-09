import type { Metadata } from "next";
import Link from "next/link";
import { Database, Server, Sparkles, Star, Workflow } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getJellyfinConnectionPreview } from "@/lib/jellyfin/config";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LetterboxdRatingsImportForm } from "@/components/import/letterboxd-ratings";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Importer & synchroniser" };

const STATUS: Record<string, { label: string; variant: "muted" | "success" | "danger" }> = {
  DISCONNECTED: { label: "Non connecté", variant: "muted" },
  CONNECTED: { label: "Connecté", variant: "success" },
  SYNCING: { label: "Synchronisation…", variant: "muted" },
  ERROR: { label: "Erreur", variant: "danger" },
};

export default async function ImportPage() {
  const user = await requireUser();
  const jellyfin = await getJellyfinConnectionPreview(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Importer &amp; synchroniser</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">
          Importez vos notes Letterboxd ou connectez Jellyfin pour synchroniser votre historique de visionnage.
          Jellyboxd doit être sur le même réseau que votre serveur Jellyfin.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Server, title: "Connecter", body: "URL + clé API Jellyfin dans les paramètres." },
          { icon: Database, title: "Mapper", body: "Films et séries reliés via TMDB / IMDb." },
          { icon: Workflow, title: "Synchroniser", body: "Vu, notes et favoris dans les deux sens." },
        ].map((s) => (
          <div key={s.title} className="surface-card p-4">
            <s.icon className="mb-2.5 h-5 w-5 text-accent" />
            <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-lg text-foreground">Importer mes notes Letterboxd</h2>
        </div>
        <Card>
          <CardBody>
            <LetterboxdRatingsImportForm />
          </CardBody>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-lg text-foreground">Jellyfin</h2>
        </div>
        {jellyfin?.hasApiKey ? (
          <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">{jellyfin.name}</span>
                <Badge variant={STATUS[jellyfin.status]?.variant ?? "muted"}>
                  {STATUS[jellyfin.status]?.label ?? jellyfin.status}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted">
                {jellyfin.baseUrl}
                {jellyfin.jellyfinUserName ? ` · ${jellyfin.jellyfinUserName}` : ""}
                {jellyfin.lastSyncedAt ? ` · synchro ${formatDate(jellyfin.lastSyncedAt)}` : ""}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/parametres">Gérer / synchroniser</Link>
            </Button>
          </div>
        ) : (
          <Card>
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Connectez votre serveur Jellyfin avec une clé API (comme Jellyseerr ou Jellystat).
              </p>
              <Button asChild size="sm">
                <Link href="/parametres">Configurer Jellyfin</Link>
              </Button>
            </CardBody>
          </Card>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground text-pretty">
          La synchro bidirectionnelle (vu, note, favori) est active dès que Jellyfin est connecté.
          Les changements dans Jellyboxd sont poussés vers Jellyfin en temps réel ; utilisez
          « Synchroniser » dans les paramètres pour récupérer l&apos;historique depuis Jellyfin.
        </p>
      </div>
    </div>
  );
}
