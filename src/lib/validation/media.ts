import { z } from "zod";
import { MEDIA_KINDS, MEDIA_PROVIDERS } from "@/lib/constants";

/**
 * Reference to a media item that may or may not exist locally yet.
 * Catalog browsing yields provider DTOs, so actions accept (provider+externalId)
 * and upsert on demand; already-local items pass mediaItemId.
 */
export const mediaRefSchema = z
  .object({
    mediaItemId: z.string().cuid().optional(),
    provider: z.enum(MEDIA_PROVIDERS).optional(),
    externalId: z.string().min(1).optional(),
    kind: z.enum(MEDIA_KINDS).optional(),
  })
  .refine((v) => v.mediaItemId || (v.provider && v.externalId && v.kind), {
    message: "Référence média invalide",
  });

export type MediaRefInput = z.infer<typeof mediaRefSchema>;
