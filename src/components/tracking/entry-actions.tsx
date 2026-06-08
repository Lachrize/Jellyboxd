"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteWatchEntryAction } from "@/server/actions/tracking";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const res = await deleteWatchEntryAction(id);
          if (!res.ok) toast({ title: "Erreur", description: res.error, variant: "error" });
          else {
            toast({ title: "Entrée supprimée", variant: "success" });
            router.refresh();
          }
        })
      }
      disabled={pending}
      aria-label="Supprimer cette entrée"
      className="text-muted transition-colors hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
