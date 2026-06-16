import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { Card, CardBody } from "@/components/ui/card";
import { LetterboxdRatingsImportForm } from "@/components/import/letterboxd-ratings";

export const metadata: Metadata = { title: "Importer mes notes Letterboxd" };

export default async function ImportPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Importer mes notes Letterboxd</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">
          Importez le fichier <code>ratings.csv</code> exporté depuis Letterboxd pour retrouver
          toutes vos notes dans Jellyboxd.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-lg text-foreground">Fichier Letterboxd</h2>
        </div>
        <Card>
          <CardBody>
            <LetterboxdRatingsImportForm />
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
