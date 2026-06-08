"use client";

import { useActionState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  importLetterboxdRatingsAction,
  type LetterboxdImportState,
} from "@/server/actions/import";

export function LetterboxdRatingsImportForm() {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<LetterboxdImportState, FormData>(
    importLetterboxdRatingsAction,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Import Letterboxd terminé",
        description: `${state.imported ?? 0} ajoutées · ${state.updated ?? 0} mises à jour · ${state.skipped ?? 0} ignorées`,
        variant: "success",
      });
    }
    if (state?.error) {
      toast({ title: "Import impossible", description: state.error, variant: "error" });
    }
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field label="Fichier ratings.csv" htmlFor="letterboxd-ratings" error={state?.error}>
        <Input
          id="letterboxd-ratings"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
        />
      </Field>

      <div className="rounded-2xl border border-border bg-surface-2/60 p-4 text-sm text-muted-foreground">
        <p>
          Import attendu : colonnes <span className="text-foreground">Date</span>,{" "}
          <span className="text-foreground">Name</span>, <span className="text-foreground">Year</span>,{" "}
          <span className="text-foreground">Rating</span>.
        </p>
        <p className="mt-1">Pour l&apos;instant, seules les notes sont importées. Aucun commentaire n&apos;est créé.</p>
      </div>

      {state?.success && (
        <div className="rounded-2xl border border-success/25 bg-success/10 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {state.imported} notes ajoutées, {state.updated} mises à jour, {state.skipped} ignorées.
          </p>
          {state.examples && state.examples.length > 0 && (
            <p className="mt-2">
              Non trouvés : {state.examples.join(", ")}
              {state.skipped && state.skipped > state.examples.length ? "…" : ""}
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : (<><Upload className="h-4 w-4" /> Importer mes notes</>)}
      </Button>
    </form>
  );
}
