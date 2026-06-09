"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteUserAction, setUserAdminAction } from "@/server/actions/admin";

export function UserRowActions({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function toggleAdmin() {
    startTransition(async () => {
      const res = await setUserAdminAction(userId, !isAdmin);
      if (!res.ok) toast({ title: "Erreur", description: res.error, variant: "error" });
      else router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Supprimer cet utilisateur et toutes ses données ? Action irréversible.")) return;
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (!res.ok) toast({ title: "Erreur", description: res.error, variant: "error" });
      else {
        toast({ title: "Utilisateur supprimé", variant: "success" });
        router.refresh();
      }
    });
  }

  const btn =
    "rounded-lg border border-border p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-40";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button onClick={toggleAdmin} disabled={pending} className={btn} title={isAdmin ? "Retirer les droits admin" : "Promouvoir admin"}>
        {isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      </button>
      {!isSelf && (
        <button onClick={remove} disabled={pending} className={`${btn} hover:!text-danger`} title="Supprimer l'utilisateur">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
