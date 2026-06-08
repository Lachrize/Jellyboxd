import { db } from "@/lib/db";
import type { ActivityType } from "@/lib/constants";

export interface ActivityInput {
  actorId: string;
  type: ActivityType;
  mediaItemId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown> | null;
  visibility?: string;
  createdAt?: Date;
}

/** Append an entry to the denormalised social activity stream. */
export async function recordActivity(input: ActivityInput) {
  return db.activity.create({
    data: {
      actorId: input.actorId,
      type: input.type,
      mediaItemId: input.mediaItemId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      data: input.data ? JSON.stringify(input.data) : null,
      visibility: input.visibility ?? "PUBLIC",
      createdAt: input.createdAt,
    },
  });
}
