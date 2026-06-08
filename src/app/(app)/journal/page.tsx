import Link from "next/link";
import type { Metadata } from "next";
import { Heart, NotebookPen, Repeat2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { localMediaInclude, localMediaLink } from "@/lib/media/local";
import { Poster } from "@/components/ui/poster";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/ui/visibility-badge";
import { DeleteEntryButton } from "@/components/tracking/entry-actions";
import { formatDate, formatMonthYear } from "@/lib/dates";
import { truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal" };

export default async function DiaryPage() {
  const user = await requireUser();

  const entries = await db.watchEntry.findMany({
    where: { userId: user.id },
    orderBy: { watchedOn: "desc" },
    take: 120,
    include: {
      review: { select: { body: true, containsSpoilers: true } },
      mediaItem: { include: localMediaInclude },
    },
  });

  // Group by month (yyyy-MM), preserving desc order.
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.watchedOn.getFullYear()}-${String(e.watchedOn.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const thisYear = new Date().getFullYear();
  const countThisYear = entries.filter((e) => e.watchedOn.getFullYear() === thisYear).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Journal</h1>
          <p className="mt-1 text-muted-foreground">
            {entries.length} visionnage{entries.length > 1 ? "s" : ""} · {countThisYear} en {thisYear}
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/explore">
            <NotebookPen className="h-4 w-4" /> Journaliser une œuvre
          </Link>
        </Button>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Votre journal est vierge"
          description="Ouvrez une fiche film ou série et appuyez sur « Journaliser » pour enregistrer un visionnage."
          action={
            <Button asChild>
              <Link href="/explore">Commencer</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {[...groups.entries()].map(([key, monthEntries]) => (
            <section key={key}>
              <h2 className="mb-3 font-serif text-lg capitalize text-muted-foreground">
                {formatMonthYear(monthEntries[0]!.watchedOn)}
              </h2>
              <div className="space-y-2.5">
                {monthEntries.map((e) => {
                  const link = localMediaLink(e.mediaItem);
                  return (
                    <div key={e.id} className="surface-card group relative flex items-start gap-3.5 p-3.5">
                      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <DeleteEntryButton id={e.id} />
                      </div>
                      <Link href={link.href ?? "#"} className="w-12 shrink-0 sm:w-14">
                        <Poster title={link.title} kind={link.kind} src={link.posterUrl} rounded="rounded-lg" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={link.href ?? "#"} className="font-medium text-foreground hover:text-accent">
                          {link.title}
                        </Link>
                        {link.subtitle && <p className="text-xs text-muted">{link.subtitle}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {e.rating ? <Stars value={e.rating} size={13} /> : null}
                          {e.rewatch && (
                            <Badge variant="muted">
                              <Repeat2 className="h-3 w-3" /> Re-vision
                            </Badge>
                          )}
                          {e.liked && <Heart className="h-3.5 w-3.5 fill-accent text-accent" />}
                          <span className="text-xs text-muted">{formatDate(e.watchedOn)}</span>
                          <VisibilityBadge visibility={e.visibility} />
                        </div>
                        {e.review && (
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {truncate(e.review.body, 220)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
