"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { regenerateSyncTokenAction } from "@/server/actions/jellyfin";

const PLUGIN_MANIFEST_URL = "https://github.com/Lachrize/jellyfin-plugin-jellyboxd/raw/main/manifest.json";

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

export function JellyfinConnect({ hasToken, appUrl }: { hasToken: boolean; appUrl: string }) {
  const router = useRouter();
  const [generating, startGenerate] = useTransition();
  const [token, setToken] = useState<string | null>(null);

  function generate() {
    startGenerate(async () => {
      const r = await regenerateSyncTokenAction();
      setToken(r.token);
      router.refresh();
    });
  }

  return (
    <div className="surface-card space-y-5 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-accent" />
        <h3 className="font-medium text-foreground">Connecter ton serveur Jellyfin</h3>
      </div>

      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-muted">
        <li>Dans Jellyfin : <strong>Tableau de bord → Extensions → Dépôts → +</strong>, colle l'URL du dépôt ci-dessous, puis installe <strong>Jellyboxd Sync</strong> depuis le catalogue et redémarre.</li>
        <li>Ouvre la config du plugin et renseigne : <strong>URL Jellyboxd</strong>, ton <strong>token</strong> (ci-dessous) et ton <strong>identifiant Jellyfin</strong>.</li>
      </ol>

      <CopyField label="URL du dépôt du plugin (à ajouter dans Jellyfin)" value={PLUGIN_MANIFEST_URL} />
      <CopyField label="URL Jellyboxd (à coller dans le plugin)" value={appUrl} />

      {token ? (
        <CopyField label="Ton token de synchro (copie-le maintenant, il ne sera plus affiché)" value={token} />
      ) : (
        <p className="text-xs text-muted">
          {hasToken
            ? "Un token a déjà été généré. Régénère-le si tu l'as perdu (l'ancien sera invalidé)."
            : "Génère ton token personnel pour relier le plugin à ton compte."}
        </p>
      )}

      <Button variant="secondary" size="sm" onClick={generate} disabled={generating}>
        {generating ? <Spinner /> : <><RefreshCw className="h-4 w-4" /> {hasToken || token ? "Régénérer le token" : "Générer mon token"}</>}
      </Button>

      <p className="border-t border-border pt-3 text-xs text-muted">
        Une fois connecté, ce que tu fais dans Jellyfin (vu, note, favori) remonte ici, et ce que tu fais ici redescend
        vers ton serveur — même s'il n'est accessible que sur ton réseau local.
      </p>
    </div>
  );
}
