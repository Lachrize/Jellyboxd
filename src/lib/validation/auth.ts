import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Au moins 3 caractères")
  .max(24, "Au plus 24 caractères")
  .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  username: usernameSchema,
  name: z.string().trim().max(60).optional().or(z.literal("")),
  password: z.string().min(8, "Au moins 8 caractères").max(100),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Requis"), // email or username
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
