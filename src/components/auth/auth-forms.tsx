"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { loginAction, type AuthState } from "@/server/actions/auth";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function LoginForm({ next, dark = false }: { next?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  const inputClass = dark
    ? "border-white/10 bg-white/[0.06] text-white placeholder:text-gray-500 focus:border-indigo-400 focus:ring-indigo-500/40"
    : undefined;
  const labelClass = dark ? "text-gray-200" : undefined;
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <input type="hidden" name="next" value={next ?? "/home"} />
      <Field label="Utilisateur Jellyfin" htmlFor="identifier" error={state?.fieldErrors?.identifier} labelClassName={labelClass}>
        <Input id="identifier" name="identifier" className={inputClass} autoComplete="username" autoFocus required />
      </Field>
      <Field label="Mot de passe Jellyfin" htmlFor="password" error={state?.fieldErrors?.password} labelClassName={labelClass}>
        <Input id="password" name="password" type="password" className={inputClass} autoComplete="current-password" required />
      </Field>
      <Button
        type="submit"
        size="lg"
        className={
          dark
            ? "w-full bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/40 hover:from-indigo-400 hover:to-indigo-500"
            : "w-full"
        }
        disabled={pending}
      >
        {pending ? <Spinner /> : "Se connecter"}
      </Button>
    </form>
  );
}

