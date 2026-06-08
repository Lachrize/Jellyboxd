import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, Clapperboard, Compass, Sparkles, Tv, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMediaProvider } from "@/lib/media";
import { mediaHref } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaCard } from "@/components/media/media-card";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  const trending = (await getMediaProvider().trending()).slice(0, 12);

  return (
    <div className="-mt-8">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grain" />
        <div className="relative py-20 sm:py-28">
          <Badge variant="accent" className="mb-6">
            <Sparkles className="h-3 w-3" /> Films &amp; séries, enfin réunis
          </Badge>
          <h1 className="max-w-3xl font-serif text-display-lg text-foreground">
            Le carnet de tout ce que vous regardez.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            Notez, critiquez et collectionnez vos films et séries. Suivez votre progression
            épisode par épisode, partagez vos goûts, et redécouvrez votre culture visuelle.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Commencer mon carnet</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/explore">
                <Compass className="h-4 w-4" /> Explorer le catalogue
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trending marquee */}
      <section className="py-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-foreground">Tendances de la semaine</h2>
          <Link href="/explore" className="text-sm text-muted-foreground link-underline">
            Tout voir
          </Link>
        </div>
        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 no-scrollbar">
          {trending.map((m, i) => (
            <div key={m.externalId} className="w-36 shrink-0 snap-start sm:w-40">
              <MediaCard
                href={mediaHref(m.kind, m.externalId)}
                title={m.title}
                year={m.year}
                kind={m.kind}
                posterUrl={m.posterUrl}
                externalRating={m.voteAverage}
                priority={i < 6}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-4 py-14 md:grid-cols-3">
        {[
          {
            icon: BookMarked,
            title: "Un vrai journal",
            body: "Chaque visionnage daté, noté, critiqué. Re-visionnez, taguez, retrouvez tout.",
          },
          {
            icon: Tv,
            title: "Les séries, nativement",
            body: "Progression saison par saison, épisode par épisode. En cours, en pause, terminée.",
          },
          {
            icon: Users,
            title: "Autour des goûts",
            body: "Suivez vos amis, likez leurs critiques, partagez des listes thématiques.",
          },
        ].map((f) => (
          <div key={f.title} className="surface-card p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="relative my-10 overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center sm:p-16">
        <div className="pointer-events-none absolute inset-0 bg-grain" />
        <div className="relative">
          <Clapperboard className="mx-auto mb-5 h-8 w-8 text-accent" />
          <h2 className="mx-auto max-w-xl font-serif text-display text-foreground">
            Votre cinémathèque vous attend.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Rejoignez Jellyboxd et donnez à vos visionnages la place qu&apos;ils méritent.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/register">Créer mon compte gratuit</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
