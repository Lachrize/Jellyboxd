import { z } from "zod";
import { mediaRefSchema } from "@/lib/validation/media";
import { MAX_RATING, VISIBILITIES } from "@/lib/constants";

const ratingValue = z.coerce.number().int().min(1).max(MAX_RATING);
const visibility = z.enum(VISIBILITIES).optional();

export const logWatchSchema = z.object({
  ref: mediaRefSchema,
  watchedOn: z.coerce.date().optional(),
  rewatch: z.coerce.boolean().optional().default(false),
  liked: z.coerce.boolean().optional().default(false),
  rating: ratingValue.optional().nullable(),
  reviewBody: z.string().trim().max(10_000).optional().or(z.literal("")),
  containsSpoilers: z.coerce.boolean().optional().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  visibility,
});

export const rateSchema = z.object({
  ref: mediaRefSchema,
  value: ratingValue.nullable(), // null clears the rating
  visibility,
});

export const reviewSchema = z.object({
  ref: mediaRefSchema,
  body: z.string().trim().min(1, "La critique ne peut pas être vide").max(10_000),
  rating: ratingValue.optional().nullable(),
  containsSpoilers: z.coerce.boolean().optional().default(false),
});

export type LogWatchInput = z.infer<typeof logWatchSchema>;
export type RateInput = z.infer<typeof rateSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
