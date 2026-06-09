import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="animate-rise-in">
      <h1 className="font-serif text-3xl text-foreground">Content de vous revoir.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Connectez-vous avec votre compte Jellyfin.
      </p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Serveur pas encore configuré ?{" "}
        <Link href="/" className="font-medium text-accent link-underline">
          Connecter Jellyfin
        </Link>
      </p>
    </div>
  );
}
