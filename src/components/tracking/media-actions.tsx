"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Globe, Heart, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { VISIBILITIES, VISIBILITY_LABELS, type Visibility } from "@/lib/constants";
import { logWatchAction, rateAction, toggleMediaLikeAction, toggleWatchlistAction } from "@/server/actions/tracking";
import { SeenToggle } from "./seen-toggle";

export interface MediaRef {
  provider: string;
  externalId: string;
  kind: string;
}

const VIS_ICON: Record<Visibility, typeof Globe> = { PUBLIC: Globe, FRIENDS: Users, PRIVATE: Lock };

export function MediaActions({
  mediaRef,
  initialRating,
  initialWatched,
  ratingSourceTitle,
  ratingImportSource,
  initialInWatchlist,
  initialLiked,
  isAuthed,
  allowRating = true,
  defaultVisibility = "PUBLIC",
}: {
  mediaRef: MediaRef;
  initialRating: number | null;
  initialWatched?: boolean;
  ratingSourceTitle?: string | null;
  ratingImportSource?: string | null;
  initialInWatchlist: boolean;
  initialLiked: boolean;
  isAuthed: boolean;
  allowRating?: boolean;
  defaultVisibility?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const [rating, setRating] = useState<number | null>(initialRating);
  const hasRating = rating != null;
  const [seen, setSeen] = useState(Boolean(initialWatched || initialRating));

  useEffect(() => {
    setSeen(Boolean(initialWatched || initialRating));
  }, [initialWatched, initialRating]);
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [liked, setLiked] = useState(initialLiked);
  const [visibility, setVisibility] = useState<Visibility>(
    (VISIBILITIES as readonly string[]).includes(defaultVisibility) ? (defaultVisibility as Visibility) : "PUBLIC",
  );

  const [watchedOn, setWatchedOn] = useState(today);
  const [review, setReview] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [tags, setTags] = useState("");

  if (!isAuthed) {
    return (
      <Button asChild className="w-full">
        <a href="/login">Connectez-vous pour noter</a>
      </Button>
    );
  }

  // Clicking a star saves the rating instantly (and counts the title as seen).
  function quickRate(value: number | null) {
    const prev = rating;
    const prevSeen = seen;
    setRating(value);
    if (value != null) setSeen(true);
    startTransition(async () => {
      const res = await rateAction({ ref: mediaRef, value, visibility });
      if (!res.ok) {
        setRating(prev);
        setSeen(prevSeen);
        toast({ title: "Échec de la notation", description: res.error, variant: "error" });
      } else {
        toast({ title: value ? "Note enregistrée" : "Note retirée", variant: "success" });
        router.refresh();
      }
    });
  }

  function toggleWatchlist() {
    const prev = inWatchlist;
    setInWatchlist(!prev);
    startTransition(async () => {
      const res = await toggleWatchlistAction(mediaRef);
      if (!res.ok) {
        setInWatchlist(prev);
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        setInWatchlist(res.data!.inWatchlist);
        toast({ title: res.data!.inWatchlist ? "Ajouté à la watchlist" : "Retiré de la watchlist", variant: "success" });
        router.refresh();
      }
    });
  }

  function toggleFavorite() {
    const prev = liked;
    setLiked(!prev);
    startTransition(async () => {
      const res = await toggleMediaLikeAction(mediaRef);
      if (!res.ok) {
        setLiked(prev);
        toast({ title: "Erreur", description: res.error, variant: "error" });
      } else {
        setLiked(res.data!.liked);
        toast({ title: res.data!.liked ? "Ajouté à vos favoris" : "Retiré des favoris", variant: "success" });
        router.refresh();
      }
    });
  }

  function save() {
    startTransition(async () => {
      const res = await logWatchAction({
        ref: mediaRef,
        watchedOn: new Date(watchedOn),
        rating: allowRating ? rating : null,
        reviewBody: review,
        containsSpoilers: spoilers,
        visibility,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (!res.ok) {
        toast({ title: "Échec", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Visionnage enregistré", variant: "success" });
      setReview("");
      setTags("");
      setSpoilers(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-card">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Votre journal</p>
          <p className="mt-1 text-sm text-muted-foreground">Notez, critiquez ou enregistrez ce visionnage.</p>
          {ratingImportSource === "LETTERBOXD" ? (
            <p className="mt-2 rounded-lg border border-accent/20 bg-accent/8 px-2.5 py-1.5 text-xs text-muted-foreground">
              Source : fichier Letterboxd
              {ratingSourceTitle ? (
                <span className="block truncate text-[11px]">Titre importé : {ratingSourceTitle}</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <SeenToggle
          mediaRef={mediaRef}
          initialWatched={seen}
          locked={hasRating}
          onWatchedChange={setSeen}
          isAuthed={isAuthed}
        />

        {allowRating && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Votre note</p>
            <StarRatingInput value={rating} onChange={quickRate} />
          </div>
        )}

        <Field label="Vu le" htmlFor="watchedOn">
          <Input id="watchedOn" type="date" value={watchedOn} max={today} onChange={(e) => setWatchedOn(e.target.value)} />
        </Field>

        <Field label="Critique (optionnel)" htmlFor="review">
          <Textarea id="review" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Qu'en avez-vous pensé ?" />
        </Field>

        {review.trim() && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="accent-accent" />
            Contient des spoilers
          </label>
        )}

        <Field label="Tags (séparés par des virgules)" htmlFor="tags">
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="chef-d'œuvre, à revoir" />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Visibilité</p>
          <div className="grid grid-cols-3 gap-1.5">
            {VISIBILITIES.map((v) => {
              const Icon = VIS_ICON[v];
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    visibility === v
                      ? "border-accent/40 bg-accent/12 text-accent"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {VISIBILITY_LABELS[v]}
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={save} disabled={pending} size="lg" className="w-full">
          {pending ? <Spinner /> : "Enregistrer le visionnage"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button variant={inWatchlist ? "outline" : "secondary"} onClick={toggleWatchlist} disabled={pending} className="w-full">
          {inWatchlist ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
          {inWatchlist ? "Dans ma watchlist" : "Ajouter à la watchlist"}
        </Button>
        <Button variant={liked ? "outline" : "secondary"} onClick={toggleFavorite} disabled={pending} className="w-full">
          <Heart className={cn("h-4 w-4", liked && "fill-accent text-accent")} />
          {liked ? "Dans vos favoris" : "Ajouter aux favoris"}
        </Button>
      </div>
    </div>
  );
}
