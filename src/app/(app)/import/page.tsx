import type { Metadata } from "next";
import { Database, Server, Sparkles, Star, Workflow } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddJellyfinForm, DeleteSourceButton } from "@/components/import/jellyfin-source";
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
  const sources = await db.importSource.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Importer &amp; synchroniser</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">
          Jellyboxd est conçu autour de sources média interchangeables. Connectez votre serveur
          Jellyfin pour, à terme, importer votre bibliothèque et synchroniser votre historique de
          visionnage.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Server, title: "Connecter", body: "Enregistrez votre serveur Jellyfin." },
          { icon: Database, title: "Mapper", body: "Films, séries, saisons et épisodes reliés via des IDs externes." },
          { icon: Workflow, title: "Synchroniser", body: "Historique et statuts de visionnage, à venir." },
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
        <h2 className="mb-3 font-serif text-lg text-foreground">Vos serveurs</h2>
        {sources.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Aucun serveur connecté"
            description="Ajoutez votre première source ci-dessous."
          />
        ) : (
          <div className="space-y-2.5">
            {sources.map((s) => (
              <div key={s.id} className="surface-card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">{s.name}</span>
                    <Badge variant={STATUS[s.status]?.variant ?? "muted"}>{STATUS[s.status]?.label ?? s.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted">{s.baseUrl} · ajouté le {formatDate(s.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Button variant="ghost" size="sm" disabled title="Bientôt disponible">
                    Synchroniser
                  </Button>
                  <DeleteSourceButton id={s.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">Connecter Jellyfin</h2>
        <Card>
          <CardBody>
            <AddJellyfinForm />
          </CardBody>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground text-pretty">
          La synchronisation bidirectionnelle (bibliothèque + statut de visionnage) est sur la
          feuille de route. L&apos;architecture (sources abstraites, <code className="text-accent">ExternalMapping</code>,
          <code className="text-accent"> ImportSource</code>) est déjà en place pour l&apos;accueillir sans refonte.
        </p>
      </div>
    </div>
  );
}
