"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { updateCredentialsAction, type AuthState } from "@/server/actions/auth";

export function CredentialsForm({ username, email }: { username: string; email: string }) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<AuthState, FormData>(updateCredentialsAction, null);

  // Hide the placeholder address auto-generated for Jellyfin-paired accounts.
  const currentEmail = email.endsWith("@jellyfin.local") ? "" : email;

  useEffect(() => {
    if (state?.success) toast({ title: "Identifiants mis à jour", variant: "success" });
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Définis un mot de passe pour te connecter directement (identifiant <strong>@{username}</strong> ou ton e-mail),
        sans repasser par le lien Jellyfin.
      </p>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Field label="E-mail" htmlFor="email" error={state?.fieldErrors?.email} hint="Optionnel — pour te connecter par e-mail.">
        <Input id="email" name="email" type="email" defaultValue={currentEmail} placeholder="toi@exemple.com" autoComplete="email" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" htmlFor="password" error={state?.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <Field label="Confirmer" htmlFor="passwordConfirm" error={state?.fieldErrors?.passwordConfirm}>
          <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" placeholder="••••••••" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : "Mettre à jour"}
        </Button>
      </div>
    </form>
  );
}
