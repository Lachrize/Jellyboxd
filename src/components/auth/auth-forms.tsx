"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { loginAction, registerAction, type AuthState } from "@/server/actions/auth";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <input type="hidden" name="next" value={next ?? "/home"} />
      <Field label="Utilisateur Jellyfin" htmlFor="identifier" error={state?.fieldErrors?.identifier}>
        <Input id="identifier" name="identifier" autoComplete="username" autoFocus required />
      </Field>
      <Field label="Mot de passe Jellyfin" htmlFor="password" error={state?.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : "Se connecter"}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field label="E-mail" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" autoFocus required />
      </Field>
      <Field label="Pseudo" htmlFor="username" error={state?.fieldErrors?.username} hint="Lettres, chiffres et _ — visible publiquement.">
        <Input id="username" name="username" autoComplete="username" required />
      </Field>
      <Field label="Nom (optionnel)" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={state?.fieldErrors?.password} hint="8 caractères minimum.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : "Créer mon compte"}
      </Button>
    </form>
  );
}
