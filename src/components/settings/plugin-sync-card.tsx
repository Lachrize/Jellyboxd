"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Shows the shared sync key (JELLYBOXD_SYNC_KEY) so an admin can paste it into
 * the Jellyfin "Jellyboxd Sync" plugin. Only rendered for admins.
 */
export function PluginSyncCard({ syncKey }: { syncKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(syncKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked (non-HTTPS) — the value is selectable anyway
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pour synchroniser <strong>notes, vu et favoris</strong> avec Jellyfin dans les deux sens, installez le plugin{" "}
          <strong>Jellyboxd Sync</strong> dans Jellyfin (Tableau de bord → Plugins), puis collez-y cette clé dans le champ{" "}
          <em>« sync token »</em>. Laissez le champ <em>« Jellyfin username »</em> vide pour synchroniser tous les comptes.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-surface-2 px-3 py-2 text-xs text-foreground">{syncKey}</code>
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
        <p className="text-xs text-muted">
          Clé serveur partagée — gardez-la privée. Réglez aussi <code>Jellyboxd URL</code> dans le plugin sur l'adresse de
          cette app.
        </p>
      </CardBody>
    </Card>
  );
}
