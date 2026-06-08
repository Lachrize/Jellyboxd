import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Film, Tv } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard, MediaGrid } from "@/components/media/media-card";
import { SectionTitle } from "@/components/media/detail-hero";
import { getMediaProvider } from "@/lib/media";
import { mediaHref } from "@/lib/links";
import type { PersonCredit } from "@/lib/media/types";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const person = await getMediaProvider().getPerson(decodeURIComponent(id));
  if (!person) return { title: "Personne introuvable" };
  return { title: person.name, description: person.biography ?? undefined };
}

function CreditsGrid({ credits }: { credits: PersonCredit[] }) {
  return (
    <MediaGrid className="md:grid-cols-5 lg:grid-cols-5">
      {credits.map((credit, index) => (
        <div key={`${credit.kind}-${credit.externalId}`} className="min-w-0">
          <MediaCard
            href={mediaHref(credit.kind, credit.externalId)}
            title={credit.title}
            year={credit.year}
            kind={credit.kind}
            posterUrl={credit.posterUrl}
            externalRating={credit.voteAverage}
            priority={index < 5}
          />
          {credit.character && (
            <p className="mt-1 truncate px-0.5 text-xs text-muted-foreground">{credit.character}</p>
          )}
        </div>
      ))}
    </MediaGrid>
  );
}

export default async function PersonPage({ params }: Params) {
  const externalId = decodeURIComponent((await params).id);
  const person = await getMediaProvider().getPerson(externalId);
  if (!person) notFound();

  const movies = person.knownFor.filter((credit) => credit.kind === "MOVIE");
  const series = person.knownFor.filter((credit) => credit.kind === "SERIES");

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="surface-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Avatar name={person.name} src={person.profileUrl} size="xl" className="h-28 w-28 text-3xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Distribution</p>
            <h1 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">{person.name}</h1>
            {person.biography && (
              <p className="mt-4 max-w-3xl line-clamp-3 text-[15px] leading-7 text-muted-foreground text-pretty">
                {person.biography}
              </p>
            )}
          </div>
        </div>
      </section>

      {person.knownFor.length === 0 ? (
        <EmptyState
          title="Aucune œuvre trouvée"
          description="Aucun autre film ou série n'est disponible pour cette personne."
        />
      ) : (
        <>
          {movies.length > 0 && (
            <section>
              <SectionTitle
                action={<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Film className="h-4 w-4" /> {movies.length}</span>}
              >
                Films
              </SectionTitle>
              <CreditsGrid credits={movies} />
            </section>
          )}

          {series.length > 0 && (
            <section>
              <SectionTitle
                action={<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Tv className="h-4 w-4" /> {series.length}</span>}
              >
                Séries
              </SectionTitle>
              <CreditsGrid credits={series} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
