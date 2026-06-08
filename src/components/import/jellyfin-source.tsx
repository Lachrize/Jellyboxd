"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { addImportSourceAction, deleteImportSourceAction, type ImportFormState } from "@/server/actions/import";

export function AddJellyfinForm() {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<ImportFormState, FormData>(addImportSourceAction, null);

  useEffect(() => {
    if (state?.success) toast({ title: "Serveur enregistré", description: "La synchronisation arrive bientôt.", variant: "success" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nom du serveur" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="Jellyfin maison" required />
      </Field>
      <Field label="URL du serveur" htmlFor="baseUrl" error={state?.fieldErrors?.baseUrl}>
        <Input id="baseUrl" name="baseUrl" placeholder="https://jellyfin.mondomaine.fr" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : (<><Plus className="h-4 w-4" /> Enregistrer le serveur</>)}
      </Button>
    </form>
  );
}

export function DeleteSourceButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deleteImportSourceAction(id);
          router.refresh();
        })
      }
      disabled={pending}
      aria-label="Supprimer la source"
      className="text-muted transition-colors hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
