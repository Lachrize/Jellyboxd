import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { personHref } from "@/lib/links";
import type { PersonDTO } from "@/lib/media/types";

export function CastRow({ cast }: { cast: PersonDTO[] }) {
  if (!cast.length) return null;
  return (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
      {cast.map((p) => (
        <Link key={p.id} href={personHref(p.id)} className="group w-20 shrink-0 text-center">
          <Avatar name={p.name} src={p.profileUrl} size="lg" className="mx-auto" />
          <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground transition-colors group-hover:text-accent">
            {p.name}
          </p>
          {p.character && <p className="line-clamp-1 text-[11px] text-muted">{p.character}</p>}
        </Link>
      ))}
    </div>
  );
}
