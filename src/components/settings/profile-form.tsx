"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, type AuthState } from "@/server/actions/auth";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; bio: string; avatarUrl: string };
}) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, null);

  useEffect(() => {
    if (state?.success) toast({ title: "Profil mis à jour", variant: "success" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nom affiché" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="Votre nom" />
      </Field>
      <Field label="Bio" htmlFor="bio" error={state?.fieldErrors?.bio} hint="280 caractères maximum.">
        <Textarea id="bio" name="bio" defaultValue={defaults.bio} placeholder="Quelques mots sur vos goûts…" />
      </Field>
      <Field label="URL d'avatar" htmlFor="avatarUrl" error={state?.fieldErrors?.avatarUrl} hint="Lien vers une image.">
        <Input id="avatarUrl" name="avatarUrl" defaultValue={defaults.avatarUrl} placeholder="https://…" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
