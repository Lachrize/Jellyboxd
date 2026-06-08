import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { getMediaProvider } from "@/lib/media";
import { mediaHref } from "@/lib/links";
import { MediaCard, MediaGrid } from "@/components/media/media-card";
import { FiltersBar } from "@/components/explore/filters-bar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Explorer" };
const EXPLORE_PAGE_SIZE = 50;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; genre?: string; year?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const kind = sp.kind === "SERIES" ? "SERIES" : "MOVIE";
  const requestedPage = Math.max(1, Number(sp.page) || 1);
  const sort = (sp.sort as "popularity" | "rating" | "recent") ?? "popularity";

  const provider = getMediaProvider();
  const [discover, genres] = await Promise.all([
    provider.discoverPage({
      kind,
      genre: sp.genre,
      year: sp.year ? Number(sp.year) : undefined,
      sort,
      page: requestedPage,
      pageSize: EXPLORE_PAGE_SIZE,
    }),
    provider.genres(kind),
  ]);
  const results = discover.results;
  const page = discover.page;
  const totalPages = discover.totalPages;

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams();
    if (sp.kind) next.set("kind", sp.kind);
    if (sp.genre) next.set("genre", sp.genre);
    if (sp.year) next.set("year", sp.year);
    if (sp.sort) next.set("sort", sp.sort);
    next.set("page", String(p));
    return `/explore?${next.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Explorer</h1>
        <p className="mt-1.5 text-muted-foreground">Parcourez le catalogue, filtrez, trouvez votre prochaine séance.</p>
      </header>

      <FiltersBar genres={genres} />

      {results.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Aucun résultat"
          description={
            requestedPage > totalPages
              ? `Cette page n'existe pas. Le catalogue accessible s'arrête à la page ${totalPages}.`
              : "Essayez d'élargir vos filtres ou de changer de catégorie."
          }
        />
      ) : (
        <>
          <MediaGrid className="md:grid-cols-5 lg:grid-cols-5">
            {results.map((m, i) => (
              <MediaCard
                key={m.externalId}
                href={mediaHref(m.kind, m.externalId)}
                title={m.title}
                year={m.year}
                kind={m.kind}
                posterUrl={m.posterUrl}
                externalRating={m.voteAverage}
                priority={i < 6}
              />
            ))}
          </MediaGrid>

          <div className="flex items-center justify-between pt-2">
            {page > 1 ? (
              <Link href={buildPageHref(page - 1)} className="text-sm text-muted-foreground link-underline">
                ← Page précédente
              </Link>
            ) : (
              <span />
            )}
            <form action="/explore" className="flex items-center gap-2 text-sm text-muted">
              {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
              {sp.genre && <input type="hidden" name="genre" value={sp.genre} />}
              {sp.year && <input type="hidden" name="year" value={sp.year} />}
              {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
              <span>Page</span>
              <input
                type="number"
                name="page"
                defaultValue={page}
                min={1}
                max={totalPages}
                className="h-9 w-20 rounded-lg border border-border bg-input px-2 text-center text-sm text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/25"
                aria-label="Choisir une page"
              />
              <span>sur {totalPages}</span>
              <button type="submit" className="text-muted-foreground link-underline">
                Aller
              </button>
            </form>
            {page < totalPages ? (
              <Link href={buildPageHref(page + 1)} className="text-sm text-muted-foreground link-underline">
                Page suivante →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  );
}
