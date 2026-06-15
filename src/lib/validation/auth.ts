import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Requis"), // Jellyfin username
  password: z.string().min(1, "Requis"),
});

export const profileSchema = z.object({
  name: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .refine((value) => value.startsWith("https://"), "L'avatar doit être une URL https.")
    .optional()
    .or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
