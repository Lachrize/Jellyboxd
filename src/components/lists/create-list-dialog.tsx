"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { createListAction, type ListFormState } from "@/server/actions/lists";

export function CreateListDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ListFormState, FormData>(createListAction, null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Créer une liste
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle liste">
        <form action={action} className="space-y-4">
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <Field label="Titre" htmlFor="title" error={state?.fieldErrors?.title}>
            <Input id="title" name="title" placeholder="Le canon science-fiction" autoFocus required />
          </Field>
          <Field label="Description (optionnel)" htmlFor="description" error={state?.fieldErrors?.description}>
            <Textarea id="description" name="description" placeholder="De quoi parle cette liste ?" />
          </Field>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="isRanked" className="accent-accent" /> Liste classée (ordonnée)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
