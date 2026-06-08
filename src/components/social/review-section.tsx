import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/media/detail-hero";
import { ReviewCard, type ReviewCardData } from "@/components/social/review-card";

export function ReviewSection({
  title,
  emptyTitle,
  emptyDescription,
  reviews,
  isAuthed,
  viewerUsername,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  reviews: ReviewCardData[];
  isAuthed: boolean;
  viewerUsername?: string;
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {reviews.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isAuthed={isAuthed}
              canDelete={viewerUsername === review.user.username}
            />
          ))}
        </div>
      )}
    </section>
  );
}
