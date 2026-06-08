import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { LikeButton } from "./like-button";
import { DeleteReviewButton } from "./review-actions";
import { VisibilityBadge } from "@/components/ui/visibility-badge";
import { profileHref } from "@/lib/links";
import { timeAgo } from "@/lib/dates";

export interface ReviewCardData {
  id: string;
  body: string;
  rating: number | null;
  containsSpoilers: boolean;
  createdAt: Date;
  user: { username: string; name: string | null; avatarUrl: string | null };
  visibility?: string;
  likeCount: number;
  likedByViewer: boolean;
}

export function ReviewCard({
  review,
  isAuthed,
  canDelete = false,
  context,
}: {
  review: ReviewCardData;
  isAuthed: boolean;
  canDelete?: boolean;
  context?: React.ReactNode;
}) {
  return (
    <article className="surface-card p-5">
      <header className="flex items-center gap-3">
        <Link href={profileHref(review.user.username)}>
          <Avatar name={review.user.name ?? review.user.username} src={review.user.avatarUrl} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={profileHref(review.user.username)} className="text-sm font-medium text-foreground hover:text-accent">
            {review.user.name ?? `@${review.user.username}`}
          </Link>
          <p className="text-xs text-muted">{timeAgo(review.createdAt)}</p>
        </div>
        {review.rating ? <Stars value={review.rating} size={14} /> : null}
      </header>

      {context}

      <div className="mt-3">
        {review.containsSpoilers && (
          <Badge variant="danger" className="mb-2">
            Spoilers
          </Badge>
        )}
        <p
          className={
            "whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground text-pretty" +
            (review.containsSpoilers ? " blur-sm transition-all duration-200 hover:blur-none" : "")
          }
        >
          {review.body}
        </p>
      </div>

      <footer className="mt-4 flex items-center gap-4">
        <LikeButton
          targetType="REVIEW"
          targetId={review.id}
          initialLiked={review.likedByViewer}
          initialCount={review.likeCount}
          isAuthed={isAuthed}
        />
        {canDelete && <DeleteReviewButton id={review.id} />}
        {canDelete && review.visibility && <VisibilityBadge visibility={review.visibility} className="ml-auto" />}
      </footer>
    </article>
  );
}
