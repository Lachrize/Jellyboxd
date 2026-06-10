"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, type AuthState } from "@/server/actions/auth";

export function ProfileForm({
  defaults,
  displayName,
  jellyfinLinked = false,
}: {
  defaults: { name: string; bio: string; avatarUrl: string };
  displayName: string;
  jellyfinLinked?: boolean;
}) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Local preview of the picked file so the user sees the change before saving.
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const previewSrc = filePreview ?? defaults.avatarUrl ?? undefined;

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Profil mis à jour", variant: "success" });
      setFilePreview(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state, toast]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFilePreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={displayName} src={previewSrc} size="xl" />
        <div className="space-y-1">
          <label
            htmlFor="avatarFile"
            className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            Changer la photo
          </label>
          <input
            ref={fileRef}
            id="avatarFile"
            name="avatarFile"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          <p className="text-xs text-muted">
            {jellyfinLinked
              ? "Synchronisée avec votre compte Jellyfin (8 Mo max)."
              : "Téléversez une image après avoir connecté Jellyfin, ou utilisez une URL ci-dessous."}
          </p>
          {state?.fieldErrors?.avatarFile && (
            <p className="text-xs text-danger">{state.fieldErrors.avatarFile}</p>
          )}
        </div>
      </div>

      <Field label="Nom affiché" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="Votre nom" />
      </Field>
      <Field label="Bio" htmlFor="bio" error={state?.fieldErrors?.bio} hint="280 caractères maximum.">
        <Textarea id="bio" name="bio" defaultValue={defaults.bio} placeholder="Quelques mots sur vos goûts…" />
      </Field>
      <Field
        label="URL d'avatar"
        htmlFor="avatarUrl"
        error={state?.fieldErrors?.avatarUrl}
        hint={
          jellyfinLinked
            ? "Optionnel : une URL https sera envoyée à Jellyfin comme nouvelle photo."
            : "Lien https vers une image."
        }
      >
        <Input
          id="avatarUrl"
          name="avatarUrl"
          // Linked accounts mirror Jellyfin via a same-origin proxy path, which
          // isn't an editable https URL — leave the field empty for them.
          defaultValue={jellyfinLinked ? "" : defaults.avatarUrl}
          placeholder="https://…"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
