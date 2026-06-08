"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteListAction, removeFromListAction } from "@/server/actions/lists";

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function remove() {
    startTransition(async () => {
      const res = await deleteListAction(listId);
      if (!res.ok) {
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        toast({ title: "Liste supprimée", variant: "success" });
        router.push("/listes");
      }
    });
  }

  return confirm ? (
    <div className="flex items-center gap-2">
      <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
        Confirmer la suppression
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Annuler
      </Button>
    </div>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
      <Trash2 className="h-4 w-4" /> Supprimer
    </Button>
  );
}

export function RemoveFromListButton({ listId, mediaItemId }: { listId: string; mediaItemId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await removeFromListAction({ listId, mediaItemId });
          router.refresh();
        })
      }
      disabled={pending}
      aria-label="Retirer de la liste"
      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-danger/80 group-hover:opacity-100"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
