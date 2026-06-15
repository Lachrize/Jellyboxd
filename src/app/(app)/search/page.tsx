import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon, SearchX, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { getMediaProvider } from "@/lib/media";
import { mediaHref, profileHref } from "@/lib/links";
import { MediaCard, MediaGrid } from "@/components/media/media-card";
import { SearchBar } from "@/components/layout/search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Recherche" };

async function searchUsers(query: string) {
  if (!query) return [];
  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { name: { contains: query } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
    },
    orderBy: [{ username: "asc" }],
    take: 6,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [users, results] = query
    ? await Promise.all([searchUsers(query), getMediaProvider().search(query)])
    : [[], []];
  const totalResults = users.length + results.length;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="font-serif text-3xl text-foreground">Recherche</h1>
        <SearchBar className="max-w-xl" defaultValue={query} />
      </header>

      {!query ? (
        <EmptyState
          icon={SearchIcon}
          title="Que cherchez-vous ?"
          description="Tapez le titre d'un film, d'une série ou le nom d'un utilisateur pour commencer."
        />
      ) : totalResults === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`Aucun résultat pour « ${query} »`}
          description="Vérifiez l'orthographe ou essayez un autre titre, nom ou pseudo."
        />
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            {totalResults} résultat{totalResults > 1 ? "s" : ""} pour « {query} »
          </p>

          {users.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-serif text-xl text-foreground">
                <UserRound className="h-4 w-4 text-accent" /> Utilisateurs
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => {
                  const displayName = user.name ?? `@${user.username}`;

                  return (
                    <Link
                      key={user.id}
                      href={profileHref(user.username)}
                      className="surface-card flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
                    >
                      <Avatar name={displayName} src={user.avatarUrl} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{displayName}</p>
                        <p className="truncate text-sm text-muted">@{user.username}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          Voir le profil
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {results.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-serif text-xl text-foreground">Films et séries</h2>
              <MediaGrid>
                {results.map((m, i) => (
                  <MediaCard
                    key={`${m.kind}-${m.externalId}`}
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
