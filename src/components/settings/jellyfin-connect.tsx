"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Link2, Link2Off, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  connectJellyfinAction,
  disconnectJellyfinAction,
  regenerateSyncTokenAction,
  type ConnectState,
} from "@/server/actions/jellyfin";

interface Status {
  connected: boolean;
  baseUrl?: string | null;
  serverName?: string | null;
  username?: string | null;
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground">{value}</code>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function JellyfinConnect({ status, hasToken, appUrl }: { status: Status; hasToken: boolean; appUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, action, pending] = useActionState<ConnectState, FormData>(connectJellyfinAction, null);
  const [disconnecting, startDisconnect] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Serveur connecté", description: state.serverName ?? undefined, variant: "success" });
      router.refresh();
    }
  }, [state, toast, router]);

  function disconnect() {
    startDisconnect(async () => {
      await disconnectJellyfinAction();
      toast({ title: "Serveur déconnecté", variant: "success" });
      router.refresh();
    });
  }

  function generate() {
    startGenerate(async () => {
      const r = await regenerateSyncTokenAction();
      setToken(r.token);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* ---- Connection ---- */}
      <div className="surface-card p-5">
        {status.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/12 text-success">
                  <Link2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{status.serverName ?? "Serveur Jellyfin"}</p>
                  <p className="text-xs text-muted">
                    {status.username ? `@${status.username} · ` : ""}
                    {status.baseUrl}
                  </p>
                </div>
              </div>
              <Badge variant="success">Connecté</Badge>
            </div>
            <Button variant="danger" size="sm" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? <Spinner /> : <><Link2Off className="h-4 w-4" /> Déconnecter</>}
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connecte ton serveur Jellyfin pour synchroniser tes films et séries (vu, note, favori).
            </p>
            <Field label="URL du serveur Jellyfin" htmlFor="baseUrl">
              <Input id="baseUrl" name="baseUrl" type="url" placeholder="http://localhost:8096" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Identifiant Jellyfin" htmlFor="username">
                <Input id="username" name="username" autoComplete="off" required />
              </Field>
              <Field label="Mot de passe Jellyfin" htmlFor="password">
                <Input id="password" name="password" type="password" autoComplete="off" required />
              </Field>
            </div>
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : <><Link2 className="h-4 w-4" /> Connecter mon serveur</>}
            </Button>
          </form>
        )}
      </div>

      {/* ---- Plugin sync token ---- */}
      <div className="surface-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <h3 className="font-medium text-foreground">Synchro depuis Jellyfin (plugin)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Pour que tes actions <em>dans Jellyfin</em> remontent ici, installe le plugin <strong>Jellyboxd</strong> sur ton
          serveur, puis renseigne dans sa configuration l'URL Jellyboxd et ton token personnel.
        </p>
        <CopyField label="URL Jellyboxd (à coller dans le plugin)" value={appUrl} />

        {token ? (
          <div className="space-y-2">
            <CopyField label="Ton token de synchro (copie-le maintenant, il ne sera plus affiché)" value={token} />
          </div>
        ) : (
          <p className="text-xs text-muted">
            {hasToken
              ? "Un token a déjà été généré. Régénère-le si tu l'as perdu (l'ancien sera invalidé)."
              : "Aucun token généré pour l'instant."}
          </p>
        )}

        <Button variant="secondary" size="sm" onClick={generate} disabled={generating}>
          {generating ? <Spinner /> : <><RefreshCw className="h-4 w-4" /> {hasToken || token ? "Régénérer le token" : "Générer mon token"}</>}
        </Button>
      </div>
    </div>
  );
}
