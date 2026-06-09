"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, RefreshCw, Server, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  connectJellyfinAction,
  disconnectJellyfinAction,
  syncJellyfinAction,
  testJellyfinConnectionAction,
} from "@/server/actions/jellyfin";
import { formatDate } from "@/lib/dates";

export interface JellyfinConnectionPreview {
  id: string;
  name: string;
  baseUrl: string | null;
  status: string;
  lastSyncedAt: Date | null;
  jellyfinUserId: string | null;
  jellyfinUserName: string | null;
  hasApiKey: boolean;
}

const STATUS: Record<string, { label: string; variant: "muted" | "success" | "danger" }> = {
  DISCONNECTED: { label: "Non connecté", variant: "muted" },
  CONNECTED: { label: "Connecté", variant: "success" },
  SYNCING: { label: "Synchronisation…", variant: "muted" },
  ERROR: { label: "Erreur", variant: "danger" },
};

export function JellyfinConnect({ connection }: { connection: JellyfinConnectionPreview | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState(connection?.name ?? "");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState(connection?.jellyfinUserId ?? "");
  const [serverName, setServerName] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [testing, startTest] = useTransition();
  const [connecting, startConnect] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [syncing, startSync] = useTransition();

  const isConnected = connection?.hasApiKey && connection.status === "CONNECTED";

  useEffect(() => {
    if (connection?.jellyfinUserId) setSelectedUser(connection.jellyfinUserId);
  }, [connection?.jellyfinUserId]);

  function buildFormData() {
    const fd = new FormData();
    fd.set("baseUrl", baseUrl);
    fd.set("apiKey", apiKey);
    fd.set("jellyfinUserId", selectedUser);
    fd.set("name", name);
    return fd;
  }

  function handleTest() {
    startTest(async () => {
      setFieldErrors({});
      const result = await testJellyfinConnectionAction(null, buildFormData());
      if (result?.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      if (result?.users) {
        setUsers(result.users);
        setServerName(result.serverName ?? null);
        if (!selectedUser && result.users[0]) setSelectedUser(result.users[0].id);
        toast({ title: "Connexion réussie", description: result.serverName ?? undefined, variant: "success" });
      }
    });
  }

  function handleConnect() {
    startConnect(async () => {
      setFieldErrors({});
      const result = await connectJellyfinAction(null, buildFormData());
      if (result?.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      toast({ title: "Jellyfin connecté", variant: "success" });
      setApiKey("");
      router.refresh();
    });
  }

  function handleSync() {
    startSync(async () => {
      const result = await syncJellyfinAction();
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      if (result?.syncResult) {
        toast({
          title: "Synchronisation terminée",
          description: `${result.syncResult.applied} élément(s) mis à jour sur ${result.syncResult.processed} analysé(s).`,
          variant: "success",
        });
        router.refresh();
      }
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      await disconnectJellyfinAction();
      toast({ title: "Jellyfin déconnecté", variant: "success" });
      setUsers([]);
      setApiKey("");
      router.refresh();
    });
  }

  const showUserPicker = users.length > 0 || Boolean(connection?.jellyfinUserId);

  return (
    <div className="surface-card space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-accent" />
          <h3 className="font-medium text-foreground">Connecter Jellyfin</h3>
        </div>
        {connection && (
          <Badge variant={STATUS[connection.status]?.variant ?? "muted"}>
            {STATUS[connection.status]?.label ?? connection.status}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-pretty">
        Comme Jellyseerr ou Jellystat : Jellyboxd doit être hébergé sur le <strong>même réseau</strong> que votre
        serveur Jellyfin. Créez une clé API dans Jellyfin (Tableau de bord → Clés API) et renseignez-la ici.
      </p>

      {isConnected && connection && (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <p className="font-medium text-foreground">{connection.name}</p>
          <p className="mt-1 text-muted-foreground">
            {connection.baseUrl}
            {connection.jellyfinUserName ? ` · ${connection.jellyfinUserName}` : ""}
          </p>
          {connection.lastSyncedAt && (
            <p className="mt-1 text-xs text-muted">Dernière synchro : {formatDate(connection.lastSyncedAt)}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Spinner /> : <><RefreshCw className="h-4 w-4" /> Synchroniser</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? <Spinner /> : <><Unplug className="h-4 w-4" /> Déconnecter</>}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4 border-t border-border pt-4">
        <Field label="URL du serveur Jellyfin" htmlFor="jf-baseUrl" error={fieldErrors.baseUrl}>
          <Input
            id="jf-baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://192.168.1.50:8096"
            required
          />
        </Field>
        <Field label="Clé API Jellyfin" htmlFor="jf-apiKey" error={fieldErrors.apiKey}>
          <Input
            id="jf-apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isConnected ? "Laisser vide pour conserver la clé actuelle" : "Clé API créée dans Jellyfin"}
            required={!isConnected}
          />
        </Field>
        <Button type="button" variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
          {testing ? <Spinner /> : "Tester la connexion"}
        </Button>
        {serverName && <p className="text-xs text-muted">Serveur détecté : {serverName}</p>}
      </div>

      {showUserPicker && (
        <div className="space-y-4 border-t border-border pt-4">
          <Field label="Utilisateur Jellyfin" htmlFor="jf-user" error={fieldErrors.jellyfinUserId}>
            <select
              id="jf-user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              required
            >
              <option value="">Choisir un utilisateur…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
              {connection?.jellyfinUserId && !users.some((u) => u.id === connection.jellyfinUserId) && (
                <option value={connection.jellyfinUserId}>{connection.jellyfinUserName ?? connection.jellyfinUserId}</option>
              )}
            </select>
          </Field>
          <Field label="Nom (optionnel)" htmlFor="jf-name">
            <Input id="jf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jellyfin maison" />
          </Field>
          <Button type="button" onClick={handleConnect} disabled={connecting || !selectedUser}>
            {connecting ? <Spinner /> : <><Link2 className="h-4 w-4" /> {isConnected ? "Mettre à jour" : "Connecter"}</>}
          </Button>
        </div>
      )}
    </div>
  );
}
