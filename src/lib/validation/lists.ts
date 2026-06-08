import { z } from "zod";
import { mediaRefSchema } from "@/lib/validation/media";

export const createListSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(80),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  isRanked: z.coerce.boolean().optional().default(false),
  isPublic: z.coerce.boolean().optional().default(true),
});

export const addToListSchema = z.object({
  listId: z.string().cuid(),
  ref: mediaRefSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const commentSchema = z.object({
  targetType: z.enum(["REVIEW", "WATCH_ENTRY", "LIST"]),
  targetId: z.string().min(1),
  body: z.string().trim().min(1, "Commentaire vide").max(2000),
  parentId: z.string().cuid().optional(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
