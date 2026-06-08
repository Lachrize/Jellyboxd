import { Globe, Lock, Users } from "lucide-react";
import { VISIBILITY_LABELS, type Visibility } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICON: Record<Visibility, typeof Globe> = { PUBLIC: Globe, FRIENDS: Users, PRIVATE: Lock };

export function VisibilityBadge({ visibility, className }: { visibility: string; className?: string }) {
  const v = (visibility in ICON ? visibility : "PUBLIC") as Visibility;
  const Icon = ICON[v];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted", className)}
      title={`Visibilité : ${VISIBILITY_LABELS[v]}`}
    >
      <Icon className="h-3 w-3" /> {VISIBILITY_LABELS[v]}
    </span>
  );
}
