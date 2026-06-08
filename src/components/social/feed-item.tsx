import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/stars";
import { Poster } from "@/components/ui/poster";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "./like-button";
import { profileHref } from "@/lib/links";
import { timeAgo } from "@/lib/dates";
import { truncate } from "@/lib/utils";
import type { FeedItem as FeedItemData } from "@/lib/services/feed";

const VERBS: Record<string, string> = {
  LOGGED: "a journalisé",
  RATED: "a noté",
  REVIEWED: "a écrit une critique de",
  LIKED_REVIEW: "a aimé une critique de",
  LIKED_MEDIA: "a ajouté à ses favoris",
  FOLLOWED: "a suivi un nouveau membre",
  LIST_CREATED: "a créé une liste",
  WATCHLIST_ADDED: "a ajouté à sa watchlist",
  SERIES_STATUS: "a mis à jour son suivi de",
  EPISODE_WATCHED: "a regardé un épisode de",
};

export function FeedItem({ item, isAuthed }: { item: FeedItemData; isAuthed: boolean }) {
  const name = item.actor.name ?? `@${item.actor.username}`;
  const verb = VERBS[item.type] ?? "a une activité sur";

  return (
    <article className="surface-card p-4">
      <div className="flex gap-3">
        <Link href={profileHref(item.actor.username)} className="shrink-0">
          <Avatar name={name} src={item.actor.avatarUrl} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Link href={profileHref(item.actor.username)} className="font-medium text-foreground hover:text-accent">
              {name}
            </Link>{" "}
            {verb}{" "}
            {item.media?.href ? (
              <Link href={item.media.href} className="font-medium text-foreground hover:text-accent">
                {item.media.title}
              </Link>
            ) : item.media ? (
              <span className="font-medium text-foreground">{item.media.title}</span>
            ) : item.listTitle ? (
              <span className="font-medium text-foreground">« {item.listTitle} »</span>
            ) : null}
          </p>

          <div className="mt-1 flex items-center gap-2">
            {item.rating ? <Stars value={item.rating} size={12} /> : null}
            <span className="text-xs text-muted">{timeAgo(item.createdAt)}</span>
          </div>

          {item.review && (
            <div className="mt-2.5 rounded-xl border border-border bg-surface-2/50 p-3">
              {item.review.containsSpoilers && <Badge variant="danger" className="mb-1.5">Spoilers</Badge>}
              <p
                className={
                  "text-sm leading-relaxed text-muted-foreground" +
                  (item.review.containsSpoilers ? " blur-sm transition-all hover:blur-none" : "")
                }
              >
                {truncate(item.review.body, 280)}
              </p>
              <div className="mt-2">
                <LikeButton
                  targetType="REVIEW"
                  targetId={item.review.id}
                  initialLiked={item.review.likedByViewer}
                  initialCount={item.review.likeCount}
                  isAuthed={isAuthed}
                />
              </div>
            </div>
          )}
        </div>

        {item.media && (
          <Link href={item.media.href ?? "#"} className="w-12 shrink-0 sm:w-14">
            <Poster title={item.media.title} kind={item.media.kind} src={item.media.posterUrl} rounded="rounded-lg" />
          </Link>
        )}
      </div>
    </article>
  );
}
