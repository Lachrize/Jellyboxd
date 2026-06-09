import { cache } from "react";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth/session";

export type SafeUser = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  defaultVisibility: string;
  createdAt: Date;
};

/**
 * Returns the authenticated user for the current request, or null.
 * `cache()` dedupes the DB hit across a single render tree.
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const result = await validateSession();
  if (!result) return null;
  const { user } = result;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    defaultVisibility: user.defaultVisibility,
    createdAt: user.createdAt,
  };
});

/** Use in server components/actions that require auth — redirects to /login. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in admin-only server components/actions. Non-admins are bounced home. */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/home");
  return user;
}
