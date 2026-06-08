"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteReviewAction } from "@/server/actions/tracking";

export function DeleteReviewButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const res = await deleteReviewAction(id);
          if (!res.ok) toast({ title: "Erreur", description: res.error, variant: "error" });
          else {
            toast({ title: "Avis supprimé", variant: "success" });
            router.refresh();
          }
        })
      }
      disabled={pending}
      aria-label="Supprimer l'avis"
      className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-danger"
    >
      <Trash2 className="h-4 w-4" /> Supprimer
    </button>
  );
}
